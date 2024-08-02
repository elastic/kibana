/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DOCS_TO_FETCH = 10000;

// Get the event logs from multiple clusters, focusing on rule runs
// as they test recurring activity easily, and augmenting with other
// bits, producing a single .ndjson file for all clusters.
main();

async function main() {
  // get urls and their host names
  const urls = process.argv.slice(2);
  const urlNoCreds = urls.map((url) => new URL(url)).map((url) => url?.origin || 'unknown');
  const urlHosts = urls
    .map((url) => new URL(url))
    .map((url) => url?.host || 'unknown')
    .map((url) => url.split('.')[0]);

  if (urls.length === 0) return help();

  // get the event logs
  const docPromises = urls.map(getRuleRunEventDocs);
  const docResults = await Promise.allSettled(docPromises);

  /** @type { any[][] } */
  const serverDocs = [];

  // log errors, and add urls to event logs
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const docResult = docResults[i];
    if (docResult.status === 'rejected') {
      console.error(`Failed to get docs from ${url}: ${docResult.reason}`);
    } else {
      for (const doc of docResult.value) {
        if (!doc.kibana) doc.kibana = {};
        // add/remove some bits - remove to save space
        doc.kibana.url = urlNoCreds[i];
        doc.kibana.host = urlHosts[i];
        delete doc.kibana.saved_objects;
        delete doc.kibana.space_ids;

        if (!doc.event) doc.event = {};
        if (doc.event.start) doc.event.startMs = new Date(doc.event.start).valueOf();
        if (doc.event.end) doc.event.endMs = new Date(doc.event.end).valueOf();
        if (doc.event.endMs && doc.event.startMs)
          doc.event.durationMs = doc.event.endMs - doc.event.startMs;
      }
      serverDocs.push(docResult.value);
    }
  }

  // for each server's docs, apply a worker id
  for (const docs of serverDocs) {
    // sort ascending by timestamp
    docs.sort((a, b) => a.event.startMs - b.event.startMs);

    assignWorkerIds(docs);

    for (const doc of docs) {
      console.log(JSON.stringify(doc));
    }
  }
}

class Worker {
  /** @param { string } id */
  constructor(id) {
    this.id = id;
    /** @type { number | undefined } */
    this.nextEnd = undefined;
    /** @type { number | undefined } */
    this.lastEnd = undefined;
  }

  /** @type { (currentDate: number) => void } */
  update(currentDate) {
    if (currentDate >= this.nextEnd) {
      this.lastEnd = this.nextEnd;
      this.nextEnd = undefined;
    }
  }

  /** @type { () => boolean } */
  isAvailable() {
    return this.nextEnd === undefined;
  }

  /** @type { (end: number) => void } */
  claimTill(end) {
    this.nextEnd = end;
  }
}

class Workers {
  constructor() {
    /** @type { Map<string, Worker[]> } */
    this.workersByServer = new Map();

    /** @type { Map<string, string> } */
    this.serverMap = new Map();
  }

  /** @type { (doc: any) => string } */
  getServerId(doc) {
    const { server_uuid: serverUuid } = doc?.kibana || {};
    return this.serverMap.get(serverUuid) || 'unknown';
  }

  /** @type { (doc: any) => Worker } */
  getAvailableWorker(doc) {
    const { startMs, endMs } = doc?.event || {};
    const { server_uuid: serverUuid } = doc?.kibana || {};
    if (!this.serverMap.has(serverUuid)) {
      this.serverMap.set(serverUuid, `${this.serverMap.size + 1}`);
    }

    const workers = this.getWorkersForServer(serverUuid);

    for (const worker of workers) {
      worker.update(startMs);
      if (worker.isAvailable()) {
        worker.claimTill(endMs);
        return worker;
      }
    }
    const worker = new Worker(workers.length + 1);
    worker.claimTill(endMs);
    workers.push(worker);

    return worker;
  }

  /** @type { (serverUuid) => Worker[] } */
  getWorkersForServer(serverUuid) {
    let workers = this.workersByServer.get(serverUuid);
    if (workers !== undefined) return workers;

    workers = [];
    this.workersByServer.set(serverUuid, workers);
    return workers;
  }
}

/** @type { (docs: any[]) => void } */
function assignWorkerIds(docs) {
  const workers = new Workers();
  for (const doc of docs) {
    const worker = workers.getAvailableWorker(doc);
    const serverId = workers.getServerId(doc).padStart(3, '0');
    const workerId = `${worker.id}`.padStart(3, '0');
    doc.kibana.worker = `${serverId}-${workerId}`;
    doc.event.preIdleMs = worker.lastEnd ? doc.event.startMs - worker.lastEnd : 0;
  }
}

/** @type { (url: string) => Promise<any[]>} */
async function getRuleRunEventDocs(url) {
  const parsedUrl = new URL(url);
  const indices = `.kibana-event-log,.kibana-event-log-ds`;
  const options = `expand_wildcards=all&ignore_unavailable=true`;
  const searchUrl = `${parsedUrl.origin}/${indices}/_search?${options}`;
  const query = getQuery();
  const authHeader = getAuthHeader(parsedUrl.username, parsedUrl.password);
  const headers = {
    'Content-Type': 'application/json',
    ...(authHeader ? { Authorization: authHeader } : {}),
  };
  const fetchResult = await fetch(searchUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(query),
  });

  if (!fetchResult.ok) {
    const text = await fetchResult.text();
    throw new Error(`Failed to fetch from ${searchUrl}: ${fetchResult.statusText}\n${text}`);
  }

  const result = await fetchResult.json();
  const sources = result.hits.hits.map((hit) => hit._source);

  return sources;
}

/** @type { (username: string, password: string) => string | undefined } */
function getAuthHeader(username, password) {
  if (!username || !password) return undefined;
  if (username.toUpperCase() === 'APIKEY') return `ApiKey ${password}`;
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${encoded}`;
}

/** @type { (size: number) => any} */
function getQuery() {
  return {
    size: DOCS_TO_FETCH,
    query: {
      bool: {
        filter: [
          { term: { 'event.provider': 'alerting' } },
          { term: { 'event.action': 'execute' } },
        ],
      },
    },
    sort: [{ '@timestamp': { order: 'desc' } }],
  };
}

function help() {
  console.error(`
usage: [this-command] <es-url1> <es-url2> ... <es-urlN>

Will fetch rule execution event logs from each url, and augment them:
- adds event.startMs           - event.start as an epoch number
- adds event.endMs             - event.end as an epoch number
- adds event.durationMs        - event.end as an epoch number
- adds event.preIdleMs         - time worker was idle before this
- adds kibana.url              - the URL passed in (which is actually ES)
- adds kibana.host             - just the host name from that URL
- adds kibana.worker           - worker in form of nodeId-workerId (unique only by url)
- deletes kibana.saved_objects - not needed and confusing
- deletes kibana.space_ids     - not needed

The output is a single .ndjson file with all the docs.
`);
}
