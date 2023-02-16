/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { has } from 'lodash/fp';
import styled from 'styled-components';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TimelineId } from '../../../../../../../../common/types';

export const DESTINATION_IP = 'destination.ip';
export const DESTINATION_PORT = 'destination.port';
export const EVENT_CATEGORY = 'event.category';
export const FILE_NAME = 'file.name';
export const HOST_NAME = 'host.name';
export const ID = '_id';
export const KIBANA_ALERT_RULE_NAME = 'kibana.alert.rule.name';
export const KIBANA_ALERT_SEVERITY = 'kibana.alert.severity';
export const PROCESS_PARENT_NAME = 'process.parent.name';
export const PROCESS_NAME = 'process.name';
export const SOURCE_IP = 'source.ip';
export const SOURCE_PORT = 'source.port';
export const USER_NAME = 'user.name';

export const eventKindMatches = (eventKind: string[] | undefined): boolean =>
  eventKind?.some((x) => x.toLocaleLowerCase != null && x.toLowerCase() === 'signal') ?? false;

export const showWith = ({ data, fieldNames }: { data: Ecs; fieldNames: string[] }): boolean =>
  fieldNames.some((x) => has(x, data));

/** Show the word `with` if any of these fields are populated */
export const WITH_FIELD_NAMES = [
  DESTINATION_IP,
  DESTINATION_PORT,
  FILE_NAME,
  PROCESS_NAME,
  PROCESS_PARENT_NAME,
  SOURCE_IP,
  SOURCE_PORT,
];

export const DEFAULT_GAP = 3; // px

export const AlertFieldFlexGroup = styled(EuiFlexGroup)<{ $scopeId: string }>`
  flex-grow: 0;
  gap: ${({ $scopeId }) => ($scopeId === TimelineId.active ? 0 : DEFAULT_GAP)}px;
`;
