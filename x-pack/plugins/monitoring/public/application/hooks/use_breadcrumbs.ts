/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import createContainer from 'constate';
import { History } from 'history';
import { Observable } from 'rxjs';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

interface Crumb {
  url?: string | null;
  label: string;
  ignoreGlobalState: boolean;
  testSubj?: string;
}
// Helper for making objects to use in a link element
const createCrumb = (
  url: string | null,
  label: string,
  testSubj?: string,
  ignoreGlobalState = false
) => {
  const crumb: Crumb = { url, label, ignoreGlobalState };
  if (testSubj) {
    crumb.testSubj = testSubj;
  }
  return crumb;
};

// generate Elasticsearch breadcrumbs
function getElasticsearchBreadcrumbs(mainInstance: any) {
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/elasticsearch', 'Elasticsearch'));
    if (mainInstance.name === 'indices') {
      breadcrumbs.push(
        createCrumb(
          '#/elasticsearch/indices',
          i18n.translate('xpack.monitoring.breadcrumbs.es.indicesLabel', {
            defaultMessage: 'Indices',
          }),
          'breadcrumbEsIndices'
        )
      );
    } else if (mainInstance.name === 'nodes') {
      breadcrumbs.push(
        createCrumb(
          '#/elasticsearch/nodes',
          i18n.translate('xpack.monitoring.breadcrumbs.es.nodesLabel', { defaultMessage: 'Nodes' }),
          'breadcrumbEsNodes'
        )
      );
    } else if (mainInstance.name === 'ml') {
      // ML Instance (for user later)
      breadcrumbs.push(
        createCrumb(
          '#/elasticsearch/ml_jobs',
          i18n.translate('xpack.monitoring.breadcrumbs.es.jobsLabel', {
            defaultMessage: 'Machine learning jobs',
          })
        )
      );
    } else if (mainInstance.name === 'ccr_shard') {
      breadcrumbs.push(
        createCrumb(
          '#/elasticsearch/ccr',
          i18n.translate('xpack.monitoring.breadcrumbs.es.ccrLabel', { defaultMessage: 'CCR' })
        )
      );
    }
    breadcrumbs.push(createCrumb(null, mainInstance.instance));
  } else {
    // don't link to Overview when we're possibly on Overview or its sibling tabs
    breadcrumbs.push(createCrumb(null, 'Elasticsearch'));
  }
  return breadcrumbs;
}

// generate Kibana breadcrumbs
function getKibanaBreadcrumbs(mainInstance: any) {
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/kibana', 'Kibana'));
    breadcrumbs.push(
      createCrumb(
        '#/kibana/instances',
        i18n.translate('xpack.monitoring.breadcrumbs.kibana.instancesLabel', {
          defaultMessage: 'Instances',
        })
      )
    );
    breadcrumbs.push(createCrumb(null, mainInstance.instance));
  } else {
    // don't link to Overview when we're possibly on Overview or its sibling tabs
    breadcrumbs.push(createCrumb(null, 'Kibana'));
  }
  return breadcrumbs;
}

// generate Logstash breadcrumbs
function getLogstashBreadcrumbs(mainInstance: any) {
  const logstashLabel = i18n.translate('xpack.monitoring.breadcrumbs.logstashLabel', {
    defaultMessage: 'Logstash',
  });
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/logstash', logstashLabel));
    if (mainInstance.name === 'nodes') {
      breadcrumbs.push(
        createCrumb(
          '#/logstash/nodes',
          i18n.translate('xpack.monitoring.breadcrumbs.logstash.nodesLabel', {
            defaultMessage: 'Nodes',
          })
        )
      );
    }
    breadcrumbs.push(createCrumb(null, mainInstance.instance));
  } else if (mainInstance.page === 'pipeline') {
    breadcrumbs.push(createCrumb('#/logstash', logstashLabel));
    breadcrumbs.push(
      createCrumb(
        '#/logstash/pipelines',
        i18n.translate('xpack.monitoring.breadcrumbs.logstash.pipelinesLabel', {
          defaultMessage: 'Pipelines',
        })
      )
    );
  } else {
    // don't link to Overview when we're possibly on Overview or its sibling tabs
    breadcrumbs.push(createCrumb(null, logstashLabel));
  }

  return breadcrumbs;
}

// generate Beats breadcrumbs
function getBeatsBreadcrumbs(mainInstance: any) {
  const beatsLabel = i18n.translate('xpack.monitoring.breadcrumbs.beatsLabel', {
    defaultMessage: 'Beats',
  });
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/beats', beatsLabel));
    breadcrumbs.push(
      createCrumb(
        '#/beats/beats',
        i18n.translate('xpack.monitoring.breadcrumbs.beats.instancesLabel', {
          defaultMessage: 'Instances',
        })
      )
    );
    breadcrumbs.push(createCrumb(null, mainInstance.instance));
  } else {
    breadcrumbs.push(createCrumb(null, beatsLabel));
  }

  return breadcrumbs;
}

// generate Apm breadcrumbs
function getApmBreadcrumbs(mainInstance: any) {
  const apmLabel = i18n.translate('xpack.monitoring.breadcrumbs.apmLabel', {
    defaultMessage: 'APM server',
  });
  const breadcrumbs = [];
  if (mainInstance.instance) {
    breadcrumbs.push(createCrumb('#/apm', apmLabel));
    breadcrumbs.push(
      createCrumb(
        '#/apm/instances',
        i18n.translate('xpack.monitoring.breadcrumbs.apm.instancesLabel', {
          defaultMessage: 'Instances',
        })
      )
    );
    breadcrumbs.push(createCrumb(null, mainInstance.instance));
  } else {
    // don't link to Overview when we're possibly on Overview or its sibling tabs
    breadcrumbs.push(createCrumb(null, apmLabel));
  }
  return breadcrumbs;
}

// generate Enterprise Search breadcrumbs
function getEnterpriseSearchBreadcrumbs(mainInstance: any) {
  const entSearchLabel = i18n.translate('xpack.monitoring.breadcrumbs.entSearchLabel', {
    defaultMessage: 'Enterprise Search',
  });
  const breadcrumbs = [];
  breadcrumbs.push(createCrumb('#/enterprise_search', entSearchLabel));
  return breadcrumbs;
}

function buildBreadcrumbs(clusterName: string, mainInstance?: any | null) {
  const homeCrumb = i18n.translate('xpack.monitoring.breadcrumbs.clustersLabel', {
    defaultMessage: 'Clusters',
  });

  let breadcrumbs = [createCrumb('#/home', homeCrumb, 'breadcrumbClusters', true)];

  if (!mainInstance?.inOverview && clusterName) {
    breadcrumbs.push(createCrumb('#/overview', clusterName));
  }

  if (mainInstance?.inElasticsearch) {
    breadcrumbs = breadcrumbs.concat(getElasticsearchBreadcrumbs(mainInstance));
  }
  if (mainInstance?.inKibana) {
    breadcrumbs = breadcrumbs.concat(getKibanaBreadcrumbs(mainInstance));
  }
  if (mainInstance?.inLogstash) {
    breadcrumbs = breadcrumbs.concat(getLogstashBreadcrumbs(mainInstance));
  }
  if (mainInstance?.inBeats) {
    breadcrumbs = breadcrumbs.concat(getBeatsBreadcrumbs(mainInstance));
  }
  if (mainInstance?.inApm) {
    breadcrumbs = breadcrumbs.concat(getApmBreadcrumbs(mainInstance));
  }
  if (mainInstance?.inEnterpriseSearch) {
    breadcrumbs = breadcrumbs.concat(getEnterpriseSearchBreadcrumbs(mainInstance));
  }

  return breadcrumbs;
}
interface BreadcrumbItem {
  ['data-test-subj']?: string;
  href?: string;
  text: string;
  ignoreGlobalState?: boolean;
}

export const useBreadcrumbs = ({ history }: { history: History }) => {
  const chrome = useKibana().services.chrome;
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([]);

  const update = useCallback(
    (bcrumbs?: BreadcrumbItem[]) => {
      if (!chrome) return;
      if (!bcrumbs) {
        const currentBreadcrumbs:
          | (Observable<any> & {
              value?: BreadcrumbItem[];
            })
          | undefined = chrome.getBreadcrumbs$()?.source;
        if (currentBreadcrumbs && currentBreadcrumbs.value) {
          bcrumbs = currentBreadcrumbs.value;
        }
      }
      const globalStateStr = location.hash.split('?')[1];
      if (
        !bcrumbs?.length ||
        globalStateStr?.indexOf('_g') !== 0 ||
        bcrumbs[0].href?.split('?')[1] === globalStateStr
      ) {
        return;
      }
      bcrumbs.forEach((breadcrumb: BreadcrumbItem) => {
        const breadcrumbHref = breadcrumb.href?.split('?')[0];
        if (breadcrumbHref && !breadcrumb.ignoreGlobalState) {
          breadcrumb.href = `${breadcrumbHref}?${globalStateStr}`;
        }
        delete breadcrumb.ignoreGlobalState;
      });
      chrome.setBreadcrumbs(bcrumbs.slice(0));
    },
    [chrome]
  );

  const generate = useCallback(
    (cluster: string, mainInstance?: any) => {
      const crumbs = buildBreadcrumbs(cluster, mainInstance);
      setBreadcrumbs(crumbs);
      update(
        crumbs.map((b) => ({
          text: b.label,
          href: b.url ? b.url : undefined,
          'data-test-subj': b.testSubj,
          ignoreGlobalState: b.ignoreGlobalState,
        }))
      );
    },
    [setBreadcrumbs, update]
  );

  useEffect(() => {
    history.listen((location, action) => {
      update();
    });
  }, [history, update]);

  return {
    generate,
    update,
    breadcrumbs,
  };
};

export const BreadcrumbContainer = createContainer(useBreadcrumbs);
