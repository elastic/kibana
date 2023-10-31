/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ElasticsearchClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { DefaultSummaryTransformInstaller } from './summary_transform_installer';
import { ALL_TRANSFORM_TEMPLATES } from './templates';

describe('Summary Transform Installer', () => {
  let esClientMock: ElasticsearchClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    loggerMock = loggingSystemMock.createLogger();
  });

  it('skips the installation when latest version already installed', async () => {
    esClientMock.transform.getTransform.mockResolvedValue({
      count: ALL_TRANSFORM_TEMPLATES.length,
      // @ts-ignore
      transforms: ALL_TRANSFORM_TEMPLATES.map((transform) => ({
        id: transform.transform_id,
        _meta: transform._meta,
      })),
    });
    const installer = new DefaultSummaryTransformInstaller(esClientMock, loggerMock);

    await installer.installAndStart();

    expect(esClientMock.transform.stopTransform).not.toHaveBeenCalled();
    expect(esClientMock.transform.deleteTransform).not.toHaveBeenCalled();
    expect(esClientMock.transform.putTransform).not.toHaveBeenCalled();
    expect(esClientMock.transform.startTransform).not.toHaveBeenCalled();
  });

  it('installs every summary transforms when none are already installed', async () => {
    esClientMock.transform.getTransform.mockResolvedValue({ count: 0, transforms: [] });
    const installer = new DefaultSummaryTransformInstaller(esClientMock, loggerMock);

    await installer.installAndStart();

    const nbOfTransforms = ALL_TRANSFORM_TEMPLATES.length;

    expect(esClientMock.transform.stopTransform).not.toHaveBeenCalled();
    expect(esClientMock.transform.deleteTransform).not.toHaveBeenCalled();
    expect(esClientMock.transform.putTransform).toHaveBeenCalledTimes(nbOfTransforms);
    expect(esClientMock.transform.startTransform).toHaveBeenCalledTimes(nbOfTransforms);
  });

  it('desinstalls previous summary transforms prior to installing the new ones', async () => {
    esClientMock.transform.getTransform.mockResolvedValue({
      count: ALL_TRANSFORM_TEMPLATES.length,
      // @ts-ignore
      transforms: ALL_TRANSFORM_TEMPLATES.map((transform) => ({
        id: transform.transform_id,
        _meta: { ...transform._meta, version: -1 },
      })),
    });
    const installer = new DefaultSummaryTransformInstaller(esClientMock, loggerMock);

    await installer.installAndStart();

    const nbOfTransforms = ALL_TRANSFORM_TEMPLATES.length;

    expect(esClientMock.transform.stopTransform).toHaveBeenCalledTimes(nbOfTransforms);
    expect(esClientMock.transform.deleteTransform).toHaveBeenCalledTimes(nbOfTransforms);
    expect(esClientMock.transform.putTransform).toHaveBeenCalledTimes(nbOfTransforms);
    expect(esClientMock.transform.startTransform).toHaveBeenCalledTimes(nbOfTransforms);
  });

  it('installs only the missing summary transforms', async () => {
    const occurrencesSummaryTransforms = ALL_TRANSFORM_TEMPLATES.filter((transform) =>
      transform.transform_id.includes('-occurrences-')
    );
    esClientMock.transform.getTransform.mockResolvedValue({
      count: occurrencesSummaryTransforms.length,
      // @ts-ignore
      transforms: occurrencesSummaryTransforms.map((transform) => ({
        id: transform.transform_id,
        _meta: transform._meta,
      })),
    });
    const installer = new DefaultSummaryTransformInstaller(esClientMock, loggerMock);

    await installer.installAndStart();

    const nbOfTransforms = ALL_TRANSFORM_TEMPLATES.length - occurrencesSummaryTransforms.length;

    expect(esClientMock.transform.stopTransform).not.toHaveBeenCalled();
    expect(esClientMock.transform.deleteTransform).not.toHaveBeenCalled();
    expect(esClientMock.transform.putTransform).toHaveBeenCalledTimes(nbOfTransforms);
    expect(esClientMock.transform.startTransform).toHaveBeenCalledTimes(nbOfTransforms);
    expect(esClientMock.transform.putTransform.mock.calls).toMatchSnapshot();
  });
});
