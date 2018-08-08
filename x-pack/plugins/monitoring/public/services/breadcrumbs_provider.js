/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Helper for making objects to use in a link element
const createCrumb = (url, label, testSubj) => {
  const crumb = { url, label };
  if (testSubj) {
    crumb.testSubj = testSubj;
  }
  return crumb;
};

// generate Elasticsearch breadcrumbs
function getElasticsearchBreadcrumbs(mainInstance) {
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/elasticsearch', 'Elasticsearch'));
    if (mainInstance.name === 'indices') {
      breadcrumbs.push(createCrumb('#/elasticsearch/indices', 'Indices', 'breadcrumbEsIndices'));
    } else if (mainInstance.name === 'nodes') {
      breadcrumbs.push(createCrumb('#/elasticsearch/nodes', 'Nodes', 'breadcrumbEsNodes'));
    } else if (mainInstance.name === 'ml') {
      // ML Instance (for user later)
      breadcrumbs.push(createCrumb('#/elasticsearch/ml_jobs', 'Jobs'));
    }
    breadcrumbs.push(createCrumb(null, mainInstance.instance));
  } else {
    // don't link to Overview when we're possibly on Overview or its sibling tabs
    breadcrumbs.push(createCrumb(null, 'Elasticsearch'));
  }
  return breadcrumbs;
}

// generate Kibana breadcrumbs
function getKibanaBreadcrumbs(mainInstance) {
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/kibana', 'Kibana'));
    breadcrumbs.push(createCrumb('#/kibana/instances', 'Instances'));
  } else {
    // don't link to Overview when we're possibly on Overview or its sibling tabs
    breadcrumbs.push(createCrumb(null, 'Kibana'));
  }
  return breadcrumbs;
}

// generate Logstash breadcrumbs
function getLogstashBreadcrumbs(mainInstance) {
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/logstash', 'Logstash'));
    if (mainInstance.name === 'nodes') {
      breadcrumbs.push(createCrumb('#/logstash/nodes', 'Nodes'));
    }
    breadcrumbs.push(createCrumb(null, mainInstance.instance));
  } else if (mainInstance.page === 'pipeline') {
    breadcrumbs.push(createCrumb('#/logstash', 'Logstash'));
    breadcrumbs.push(createCrumb('#/logstash/pipelines', 'Pipelines'));
  } else {
    // don't link to Overview when we're possibly on Overview or its sibling tabs
    breadcrumbs.push(createCrumb(null, 'Logstash'));
  }

  return breadcrumbs;
}

// generate Beats breadcrumbs
function getBeatsBreadcrumbs(mainInstance) {
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/beats', 'Beats'));
    breadcrumbs.push(createCrumb('#/beats/beats', 'Instances'));
    breadcrumbs.push(createCrumb(null, mainInstance.instance));
  } else {
    breadcrumbs.push(createCrumb(null, 'Beats'));
  }

  return breadcrumbs;
}

export function breadcrumbsProvider() {
  return function createBreadcrumbs(clusterName, mainInstance) {
    let breadcrumbs = [ createCrumb('#/home', 'Clusters', 'breadcrumbClusters') ];

    if (!mainInstance.inOverview && clusterName) {
      breadcrumbs.push(createCrumb('#/overview', clusterName));
    }

    if (mainInstance.inElasticsearch) {
      breadcrumbs = breadcrumbs.concat(getElasticsearchBreadcrumbs(mainInstance));
    }
    if (mainInstance.inKibana) {
      breadcrumbs = breadcrumbs.concat(getKibanaBreadcrumbs(mainInstance));
    }
    if (mainInstance.inLogstash) {
      breadcrumbs = breadcrumbs.concat(getLogstashBreadcrumbs(mainInstance));
    }
    if (mainInstance.inBeats) {
      breadcrumbs = breadcrumbs.concat(getBeatsBreadcrumbs(mainInstance));
    }

    return breadcrumbs;
  };
}
