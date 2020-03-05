/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'src/core/server';
import { CheckContext } from '../../types';

export async function check(es: IScopedClusterClient, { deploymentId, indexName }: CheckContext) {
  const response = await es.callAsInternalUser('search', {
    index: indexName,
    size: 8,
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      sort: [{ publishOn: { order: 'desc' } }],
      query: {
        term: {
          deployment_id: {
            value: deploymentId,
          },
        },
      },
    },
  });
  if (response.hits.hits && response.hits.hits.length) {
    const sources = response.hits.hits.map((hit: any) => {
      const { deployment_id, ...notification } = hit._source;
      return notification;
    });
    return sources;
  }

  // Mock return of pre-saved documents on the first fetch.
  // These will be resent from the client with "seen" status after the first fetch.
  // So the mocking is only needed for the first time.
  return [
    // {
    //   hash: '19fdf37972',
    //   title: 'Get to know the ELK Stack',
    //   description:
    //     'Whether you call it the ELK Stack or the Elastic Stack, our introductory webinar offers a demo of the key features of Elasticsearch, Kibana, Beats, and Logstash. We show you how to get started.',
    //   linkUrl: 'https://www.elastic.co/webinars/introduction-elk-stack?blade=kibanafeed',
    //   linkText: 'Watch our webinar',
    //   badge: null,
    //   publishOn: '1575151200000',
    //   expireOn: '1580508000000',
    //   status: 'new',
    //   timestamp: '2020-01-22T08:52:37.042Z',
    //   channel_id: 'notifications',
    // },
    // {
    //   hash: 'c00623fbe0',
    //   title: 'Take your dashboard to the next level',
    //   description:
    //     'Discover how to create eye-catching visualizations by taking advantage of all the great features that Kibana has to offer.',
    //   linkUrl: 'https://www.elastic.co/webinars/level-up-kibana-dashboards?blade=kibanafeed',
    //   linkText: 'Watch our webinar',
    //   badge: null,
    //   publishOn: '1575151200000',
    //   expireOn: '1580508000000',
    //   status: 'new',
    //   timestamp: '2020-01-22T08:52:37.023Z',
    //   channel_id: 'notifications',
    // },
    // {
    //   hash: '98c884d7d0',
    //   title: 'Kibana 7.5.0 released',
    //   description:
    //     'Kibana Lens makes it simple to go from data to visualization with drag and drop fields, instant previews, and the flexibility to switch data sources.',
    //   linkUrl: 'https://www.elastic.co/blog/kibana-7-5-0-released?blade=kibanafeed',
    //   linkText: 'Learn more in our blog',
    //   badge: '7.5',
    //   publishOn: '1575151200000',
    //   expireOn: '1580508000000',
    //   status: 'new',
    //   timestamp: '2020-01-22T08:52:37.003Z',
    //   channel_id: 'notifications',
    // },
    // {
    //   hash: '583bb3ec63',
    //   title: 'Elastic Security 7.5.0 released',
    //   description:
    //     'Elastic Security 7.5 arms Elastic SIEM with event data from Elastic Endpoint Security. Plus new anomaly detection jobs, UI enhancements, and more!',
    //   linkUrl: 'https://www.elastic.co/blog/elastic-security-7-5-0-released?blade=kibanafeed',
    //   linkText: 'Learn more in our blog',
    //   badge: '7.5',
    //   publishOn: '1575151200000',
    //   expireOn: '1580508000000',
    //   status: 'new',
    //   timestamp: '2020-01-22T08:52:36.983Z',
    //   channel_id: 'notifications',
    // },
    // {
    //   hash: '0e3528c2ed',
    //   title: 'Elastic Observability 7.5.0 released',
    //   description: 'Elastic Metrics gains steam with Azure monitoring and Endgame integration.',
    //   linkUrl: 'https://www.elastic.co/blog/elastic-observability-7-5-0-released?blade=kibanafeed',
    //   linkText: 'Learn more in our blog',
    //   badge: '7.5',
    //   publishOn: '1575151200000',
    //   expireOn: '1580508000000',
    //   status: 'new',
    //   timestamp: '2020-01-22T08:52:36.964Z',
    //   channel_id: 'notifications',
    // },
    {
      hash: 'a7212ee962',
      title: 'Have you considered Kibana Lens?',
      description:
        'Do you know about the new way to visualise your data? Have you tried Kibana Lens yet?',
      linkUrl: 'https://www.elastic.co/blog/introducing-kibana-lens?blade=kibanafeed',
      linkText: 'Learn more in our blog',
      badge: '7.5',
      publishOn: '1575151200000',
      expireOn: '1580508000000',
      status: 'new',
      timestamp: '2020-01-22T08:52:36.946Z',
      channel_id: 'notifications',
    },
    // {
    //   hash: '12891b24de',
    //   title: 'Elastic Stack 7.5.0 released',
    //   description:
    //     'New in 7.5: more intuitive visualizations, improvements to our Observability and Security solutions, and Elastic Enterprise Search joins the release train.',
    //   linkUrl: 'https://www.elastic.co/blog/elastic-stack-7-5-0-released?blade=kibanafeed',
    //   linkText: 'Learn more in our blog',
    //   badge: '7.5',
    //   publishOn: '1575151200000',
    //   expireOn: '1580508000000',
    //   status: 'new',
    //   timestamp: '2020-01-22T08:52:36.926Z',
    //   channel_id: 'notifications',
    // },
    {
      hash: 'ae66caf99c',
      title: 'Kibana Lens Overview',
      description:
        'Watch this video to learn how Kibana Lens can help both experienced and brand new Kibana users streamline existing analysis activities with easy and intuitive data visualization.',
      linkUrl:
        'https://www.elastic.co/webinars/kibana-lens-an-easy-intuitive-way-to-visualize-data?blade=kibanafeed',
      linkText: 'Watch this video',
      badge: '7.5',
      publishOn: '1578434400000',
      expireOn: '1580508000000',
      status: 'new',
      timestamp: '2020-01-22T08:52:36.909Z',
      channel_id: 'notifications',
    },
  ];
}
