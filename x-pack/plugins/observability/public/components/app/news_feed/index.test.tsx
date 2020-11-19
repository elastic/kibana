/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { NewsItem } from '../../../services/get_news_feed';
import { render } from '../../../utils/test_helper';
import { NewsFeed } from './';

const newsFeedItems = [
  {
    title: {
      en: 'Elastic introduces OpenTelemetry integration',
    },
    description: {
      en:
        'We are pleased to announce the availability of the Elastic OpenTelemetry integration — available on Elastic Cloud, or when you download Elastic APM.',
    },
    link_url: {
      en:
        'https://www.elastic.co/blog/elastic-apm-opentelemetry-integration?blade=observabilitysolutionfeed',
    },
    image_url: {
      en: 'foo.png',
    },
  },
  {
    title: {
      en: 'Kubernetes observability tutorial: Log monitoring and analysis',
    },
    description: {
      en:
        'Learn how Elastic Observability makes it easy to monitor and detect anomalies in millions of logs from thousands of containers running hundreds of microservices — while Kubernetes scales applications with changing pod counts. All from a single UI.',
    },
    link_url: {
      en:
        'https://www.elastic.co/blog/kubernetes-observability-tutorial-k8s-log-monitoring-and-analysis-elastic-stack?blade=observabilitysolutionfeed',
    },
    image_url: null,
  },
  {
    title: {
      en: 'Kubernetes observability tutorial: K8s cluster setup and demo app deployment',
    },
    description: {
      en:
        'This blog will walk you through configuring the environment you will be using for the Kubernetes observability tutorial blog series. We will be deploying Elasticsearch Service, a Minikube single-node Kubernetes cluster setup, and a demo app.',
    },
    link_url: {
      en:
        'https://www.elastic.co/blog/kubernetes-observability-tutorial-k8s-cluster-setup-demo-app-deployment?blade=observabilitysolutionfeed',
    },
    image_url: {
      en: null,
    },
  },
] as NewsItem[];
describe('News', () => {
  it('renders resources with all elements', () => {
    const { getByText, getAllByText, queryAllByTestId } = render(
      <NewsFeed items={newsFeedItems} />
    );
    expect(getByText("What's new")).toBeInTheDocument();
    expect(getAllByText('Read full story').length).toEqual(3);
    expect(queryAllByTestId('news_image').length).toEqual(1);
  });
});
