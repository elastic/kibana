/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IconType } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';

import { RowRenderer, RowRendererContainer } from '..';

import { Row, SystemGenericDetails, SystemGenericFileDetails } from '.';
import * as i18n from './translations';

export const createGenericSystemRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  isInstance: ecs => {
    const module: string | null | undefined = get('event.module', ecs);
    const action: string | null | undefined = get('event.action', ecs);
    return (
      module != null &&
      module.toLowerCase() === 'system' &&
      action != null &&
      action.toLowerCase() === actionName
    );
  },
  renderRow: ({ browserFields, data, width, children }) => (
    <Row>
      {children}
      <RowRendererContainer width={width}>
        <SystemGenericDetails
          browserFields={browserFields}
          data={data}
          contextId={actionName}
          text={text}
        />
      </RowRendererContainer>
    </Row>
  ),
});

export const createGenericFileRowRenderer = ({
  actionName,
  text,
  fileIcon = 'document',
}: {
  actionName: string;
  text: string;
  fileIcon?: IconType;
}): RowRenderer => ({
  isInstance: ecs => {
    const module: string | null | undefined = get('event.module', ecs);
    const action: string | null | undefined = get('event.action', ecs);
    return (
      module != null &&
      module.toLowerCase() === 'system' &&
      action != null &&
      action.toLowerCase() === actionName
    );
  },
  renderRow: ({ browserFields, data, width, children }) => (
    <Row>
      {children}
      <RowRendererContainer width={width}>
        <SystemGenericFileDetails
          browserFields={browserFields}
          data={data}
          contextId={actionName}
          text={text}
          fileIcon={fileIcon}
        />
      </RowRendererContainer>
    </Row>
  ),
});

const systemLoginRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_login',
  text: i18n.ATTEMPTED_LOGIN,
});

const systemLogoutRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_logout',
  text: i18n.LOGGED_OUT,
});

const systemProcessStartedRowRenderer = createGenericFileRowRenderer({
  actionName: 'process_started',
  text: i18n.PROCESS_STARTED,
});

export const systemRowRenderers: RowRenderer[] = [
  systemLoginRowRenderer,
  systemLogoutRowRenderer,
  systemProcessStartedRowRenderer,
];
