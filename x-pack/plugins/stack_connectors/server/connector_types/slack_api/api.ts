/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorMetricsService } from '@kbn/actions-plugin/server/lib';
import type {
  PostMessageSubActionParams,
  PostBlockkitSubActionParams,
  SlackApiService,
  ValidChannelIdSubActionParams,
} from '../../../common/slack_api/types';

const validChannelIdHandler = async ({
  externalService,
  params: { channelId },
  connectorMetricsService,
}: {
  externalService: SlackApiService;
  params: ValidChannelIdSubActionParams;
  connectorMetricsService: ConnectorMetricsService;
}) => await externalService.validChannelId(channelId ?? '', connectorMetricsService);

const postMessageHandler = async ({
  externalService,
  params: { channelIds, channels, text },
  connectorMetricsService,
}: {
  externalService: SlackApiService;
  params: PostMessageSubActionParams;
  connectorMetricsService: ConnectorMetricsService;
}) => await externalService.postMessage({ channelIds, channels, text }, connectorMetricsService);

const postBlockkitHandler = async ({
  externalService,
  params: { channelIds, channels, text },
  connectorMetricsService,
}: {
  externalService: SlackApiService;
  params: PostBlockkitSubActionParams;
  connectorMetricsService: ConnectorMetricsService;
}) => await externalService.postBlockkit({ channelIds, channels, text }, connectorMetricsService);

export const api = {
  validChannelId: validChannelIdHandler,
  postMessage: postMessageHandler,
  postBlockkit: postBlockkitHandler,
};
