/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { PageTemplate } from '../page_template';
import { TabMenuItem, PageTemplateProps } from '../page_template';

interface LogstashTemplateProps extends PageTemplateProps {
  cluster: any;
  instance?: any;
  pipelineId?: string;
  pipelineVersions?: string[];
  tabsDisabled?: boolean;
}

export const LogstashTemplate: React.FC<LogstashTemplateProps> = ({
  cluster,
  instance,
  pipelineId,
  pipelineVersions,
  tabsDisabled,
  ...props
}) => {
  const tabs: TabMenuItem[] = [];
  if (!tabsDisabled) {
    if (!instance && !pipelineId) {
      tabs.push({
        id: 'overview',
        label: i18n.translate('xpack.monitoring.logstashNavigation.overviewLinkText', {
          defaultMessage: 'Overview',
        }),
        route: '/logstash',
      });
      tabs.push({
        id: 'nodes',
        label: i18n.translate('xpack.monitoring.logstashNavigation.nodesLinkText', {
          defaultMessage: 'Nodes',
        }),
        route: '/logstash/nodes',
      });
      tabs.push({
        id: 'pipelines',
        label: i18n.translate('xpack.monitoring.logstashNavigation.pipelinesLinkText', {
          defaultMessage: 'Pipelines',
        }),
        route: '/logstash/pipelines',
      });
    } else if (instance) {
      tabs.push({
        id: 'overview',
        label: i18n.translate('xpack.monitoring.logstashNavigation.instance.overviewLinkText', {
          defaultMessage: 'Overview',
        }),
        route: `/logstash/node/${instance.nodeSummary?.uuid}`,
      });
      tabs.push({
        id: 'pipeline',
        label: i18n.translate('xpack.monitoring.logstashNavigation.instance.pipelinesLinkText', {
          defaultMessage: 'Pipelines',
        }),
        route: `/logstash/node/${instance.nodeSummary?.uuid}/pipelines`,
        testSubj: 'logstashNodeDetailPipelinesLink',
      });
      tabs.push({
        id: 'advanced',
        label: i18n.translate('xpack.monitoring.logstashNavigation.instance.advancedLinkText', {
          defaultMessage: 'Advanced',
        }),
        route: `/logstash/node/${instance.nodeSummary?.uuid}/advanced`,
        testSubj: 'logstashNodeDetailAdvancedLink',
      });
    }
  }

  if (pipelineVersions && pipelineVersions.length) {
    // todo add this in: https://github.com/elastic/kibana/blob/4584a8b570402aa07832cf3e5b520e5d2cfa7166/x-pack/plugins/monitoring/public/directives/main/index.js#L36, https://github.com/elastic/kibana/blob/c07a512e4647a40d8e891eb24f5912783b561fba/x-pack/plugins/monitoring/public/directives/main/index.html#L293-L298
    // tabs.push({
    //   id: 'dropdown-elm',
    // })
  }

  return <PageTemplate {...props} tabs={tabs} product="logstash" />;
};
