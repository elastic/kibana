/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import archiver from 'archiver';
import type { ToolingLog } from '@kbn/tooling-log';

interface PluginsTestServerOptions {
  port: number;
  assetsDir: string;
  log: ToolingLog;
}

/**
 * A lightweight HTTP server that serves plugin zip archives for integration tests.
 *
 * Supports two modes:
 * - Direct zip: `GET /plugins/{name}.zip` — archive with plugin at root
 * - GitHub-style: `GET /{owner}/{repo}/archive/{ref}.zip` — archive with `{repo}-{ref}/` root prefix
 */
export class PluginsTestServer {
  private server?: http.Server;
  private readonly port: number;
  private readonly assetsDir: string;
  private readonly log: ToolingLog;

  constructor({ port, assetsDir, log }: PluginsTestServerOptions) {
    this.port = port;
    this.assetsDir = assetsDir;
    this.log = log;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http
        .createServer((req, res) => {
          this.handleRequest(req, res);
        })
        .on('error', reject)
        .listen(this.port, () => {
          this.log.info(`PluginsTestServer listening on port ${this.port}`);
          resolve();
        });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.log.info('PluginsTestServer stopped');
    }
  }

  getUrl(): string {
    return `http://localhost:${this.port}`;
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = req.url ?? '';

    // Direct zip: /plugins/{name}.zip
    const directZipMatch = url.match(/^\/plugins\/([^/]+)\.zip$/);
    if (directZipMatch) {
      const pluginName = directZipMatch[1];
      this.serveDirectZip(pluginName, res);
      return;
    }

    // GitHub-style: /{owner}/{repo}/archive/{ref}.zip
    const githubMatch = url.match(/^\/[^/]+\/([^/]+)\/archive\/([^/]+)\.zip$/);
    if (githubMatch) {
      const repo = githubMatch[1];
      const ref = githubMatch[2];
      this.serveGithubArchive(repo, ref, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }

  /**
   * Serves a zip with the plugin files directly at the archive root.
   */
  private serveDirectZip(pluginName: string, res: http.ServerResponse): void {
    const pluginDir = `${this.assetsDir}/${pluginName}`;
    const archive = archiver('zip', { zlib: { level: 0 } });

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${pluginName}.zip"`,
    });

    archive.pipe(res);
    archive.directory(pluginDir, false);
    void archive.finalize();
  }

  /**
   * Serves a zip that mimics GitHub's archive format:
   * all files are nested under a `{repo}-{ref}/` root prefix.
   */
  private serveGithubArchive(repo: string, ref: string, res: http.ServerResponse): void {
    const pluginDir = `${this.assetsDir}/${repo}`;
    const rootPrefix = `${repo}-${ref}`;
    const archive = archiver('zip', { zlib: { level: 0 } });

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${repo}-${ref}.zip"`,
    });

    archive.pipe(res);
    archive.directory(pluginDir, rootPrefix);
    void archive.finalize();
  }
}
