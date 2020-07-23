/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getNewsFeed } from './get_news_feed';
import { AppMountContext } from 'kibana/public';

describe('getNewsFeed', () => {
  const originalConsole = global.console;
  beforeAll(() => {
    // mocks console to avoid poluting the test output
    global.console = ({ error: jest.fn() } as unknown) as typeof console;
  });

  afterAll(() => {
    global.console = originalConsole;
  });
  it('Returns empty array when api throws exception', async () => {
    const core = ({
      http: {
        get: async () => {
          throw new Error('Boom');
        },
      },
    } as unknown) as AppMountContext['core'];

    const newsFeed = await getNewsFeed({ core });
    expect(newsFeed.items).toEqual([]);
  });
  it('Returns array with the news feed', async () => {
    const core = ({
      http: {
        get: async () => {
          return {
            items: [
              {
                title: {
                  en: 'Elastic introduces OpenTelemetry integration',
                },
                description: {
                  en:
                    'We are pleased to announce the availability of the Elastic OpenTelemetry integration — available on Elastic Cloud, or when you download Elastic APM.',
                },
                link_text: null,
                link_url: {
                  en:
                    'https://www.elastic.co/blog/elastic-apm-opentelemetry-integration?blade=observabilitysolutionfeed',
                },
                languages: null,
                badge: null,
                image_url: null,
                publish_on: '2020-07-02T00:00:00',
                expire_on: '2021-05-02T00:00:00',
                hash: '012caf3e161127d618ae8cc95e3e63f009a45d343eedf2f5e369cc95b1f9d9d3',
              },
              {
                title: {
                  en: 'Kubernetes observability tutorial: Log monitoring and analysis',
                },
                description: {
                  en:
                    'Learn how Elastic Observability makes it easy to monitor and detect anomalies in millions of logs from thousands of containers running hundreds of microservices — while Kubernetes scales applications with changing pod counts. All from a single UI.',
                },
                link_text: null,
                link_url: {
                  en:
                    'https://www.elastic.co/blog/kubernetes-observability-tutorial-k8s-log-monitoring-and-analysis-elastic-stack?blade=observabilitysolutionfeed',
                },
                languages: null,
                badge: null,
                image_url: null,
                publish_on: '2020-06-23T00:00:00',
                expire_on: '2021-06-23T00:00:00',
                hash: '79a28cb9be717e82df80bf32c27e5d475e56d0d315be694b661d133f9a58b3b3',
              },
              {
                title: {
                  en:
                    'Kubernetes observability tutorial: K8s cluster setup and demo app deployment',
                },
                description: {
                  en:
                    'This blog will walk you through configuring the environment you will be using for the Kubernetes observability tutorial blog series. We will be deploying Elasticsearch Service, a Minikube single-node Kubernetes cluster setup, and a demo app.',
                },
                link_text: null,
                link_url: {
                  en:
                    'https://www.elastic.co/blog/kubernetes-observability-tutorial-k8s-cluster-setup-demo-app-deployment?blade=observabilitysolutionfeed',
                },
                languages: null,
                badge: null,
                image_url: null,
                publish_on: '2020-06-23T00:00:00',
                expire_on: '2021-06-23T00:00:00',
                hash: 'ad682c355af3d4470a14df116df3b441e941661b291cdac62335615e7c6f13c2',
              },
            ],
          };
        },
      },
    } as unknown) as AppMountContext['core'];

    const newsFeed = await getNewsFeed({ core });
    expect(newsFeed.items.length).toEqual(3);
  });
});
