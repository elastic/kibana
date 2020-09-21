/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IngestPipelinesUrlGenerator, INGEST_PIPELINES_PAGES } from './url_generator';

describe('IngestPipelinesUrlGenerator', () => {
  const getAppBasePath = (absolute: boolean = false) => {
    if (absolute) {
      return Promise.resolve('http://localhost/app/test_app');
    }
    return Promise.resolve('/app/test_app');
  };
  const urlGenerator = new IngestPipelinesUrlGenerator(getAppBasePath);

  describe('Pipelines List', () => {
    it('should generate correct relative url for list without pipelineId', async () => {
      const url = await urlGenerator.createUrl({
        page: INGEST_PIPELINES_PAGES.LIST,
      });
      expect(url).toBe('/app/test_app/');
    });

    it('should generate correct absolute url for list without pipelineId', async () => {
      const url = await urlGenerator.createUrl({
        page: INGEST_PIPELINES_PAGES.LIST,
        absolute: true,
      });
      expect(url).toBe('http://localhost/app/test_app/');
    });
    it('should generate correct relative url for list with a pipelineId', async () => {
      const url = await urlGenerator.createUrl({
        page: INGEST_PIPELINES_PAGES.LIST,
        pipelineId: 'pipeline_name',
      });
      expect(url).toBe('/app/test_app/?pipeline=pipeline_name');
    });

    it('should generate correct absolute url for list with a pipelineId', async () => {
      const url = await urlGenerator.createUrl({
        page: INGEST_PIPELINES_PAGES.LIST,
        pipelineId: 'pipeline_name',
        absolute: true,
      });
      expect(url).toBe('http://localhost/app/test_app/?pipeline=pipeline_name');
    });
  });

  describe('Pipeline Edit', () => {
    it('should generate correct relative url for pipeline edit', async () => {
      const url = await urlGenerator.createUrl({
        page: INGEST_PIPELINES_PAGES.EDIT,
        pipelineId: 'pipeline_name',
      });
      expect(url).toBe('/app/test_app/edit/pipeline_name');
    });

    it('should generate correct absolute url for pipeline edit', async () => {
      const url = await urlGenerator.createUrl({
        page: INGEST_PIPELINES_PAGES.EDIT,
        pipelineId: 'pipeline_name',
        absolute: true,
      });
      expect(url).toBe('http://localhost/app/test_app/edit/pipeline_name');
    });
  });

  describe('Pipeline Clone', () => {
    it('should generate correct relative url for pipeline clone', async () => {
      const url = await urlGenerator.createUrl({
        page: INGEST_PIPELINES_PAGES.CLONE,
        pipelineId: 'pipeline_name',
      });
      expect(url).toBe('/app/test_app/create/pipeline_name');
    });

    it('should generate correct absolute url for pipeline clone', async () => {
      const url = await urlGenerator.createUrl({
        page: INGEST_PIPELINES_PAGES.CLONE,
        pipelineId: 'pipeline_name',
        absolute: true,
      });
      expect(url).toBe('http://localhost/app/test_app/create/pipeline_name');
    });
  });

  describe('Pipeline Create', () => {
    it('should generate correct relative url for pipeline create', async () => {
      const url = await urlGenerator.createUrl({
        page: INGEST_PIPELINES_PAGES.CREATE,
        pipelineId: 'pipeline_name',
      });
      expect(url).toBe('/app/test_app/create');
    });

    it('should generate correct absolute url for pipeline clone', async () => {
      const url = await urlGenerator.createUrl({
        page: INGEST_PIPELINES_PAGES.CREATE,
        pipelineId: 'pipeline_name',
        absolute: true,
      });
      expect(url).toBe('http://localhost/app/test_app/create');
    });
  });
});
