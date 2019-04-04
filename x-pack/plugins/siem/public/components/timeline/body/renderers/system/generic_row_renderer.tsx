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

const systemProcessStartedRowRenderer = createGenericFileRowRenderer({
  actionName: 'process_started',
  text: i18n.PROCESS_STARTED,
});

const systemProcessStoppedRowRenderer = createGenericFileRowRenderer({
  actionName: 'process_stopped',
  text: i18n.PROCESS_STOPPED,
});

const systemExistingRowRenderer = createGenericFileRowRenderer({
  actionName: 'existing_process',
  text: i18n.EXISTING_PROCESS,
});

const systemSocketOpenedRowRenderer = createGenericFileRowRenderer({
  actionName: 'socket_opened',
  text: i18n.SOCKET_OPENED,
});

const systemSocketClosedRowRenderer = createGenericFileRowRenderer({
  actionName: 'socket_closed',
  text: i18n.SOCKET_CLOSED,
});

const systemExistingUserRowRenderer = createGenericSystemRowRenderer({
  actionName: 'existing_user',
  text: i18n.EXISTING_USER,
});

const systemExistingSocketRowRenderer = createGenericFileRowRenderer({
  actionName: 'existing_socket',
  text: i18n.EXISTING_SOCKET,
});

// TODO: This MUST BE CUSTOM using system.audit.package
const systemExistingPackageRowRenderer = createGenericFileRowRenderer({
  actionName: 'existing_package',
  text: i18n.EXISTING_PACKAGE,
});

const systemInvalidRowRenderer = createGenericFileRowRenderer({
  actionName: 'invalid',
  text: i18n.INVALID,
});

const systemUserChangedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_changed',
  text: i18n.USER_CHANGED,
});

// TODO: Either show the message or show the uptime, but what else does this action show?
const systemHostChangedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'host',
  text: i18n.HOST_CHANGED,
});

const systemUserAddedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_added',
  text: i18n.USER_ADDED,
});

const systemLogoutRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_logout',
  text: i18n.LOGGED_OUT,
});

const systemProcessErrorRowRenderer = createGenericFileRowRenderer({
  actionName: 'process_error',
  text: i18n.PROCESS_ERROR,
});

// TODO: Remove this once this has been replaced everywhere with error
const systemErrorRowRendererDeprecated = createGenericSystemRowRenderer({
  actionName: 'error:',
  text: i18n.ERROR,
});

const systemErrorRowRenderer = createGenericSystemRowRenderer({
  actionName: 'error',
  text: i18n.ERROR,
});

// TODO: This MUST BE CUSTOM using system.audit.package
const systemPackageInstalledRowRenderer = createGenericSystemRowRenderer({
  actionName: 'package_installed',
  text: i18n.PACKAGE_INSTALLED,
});

// TODO: Test this
const systemBootRowRenderer = createGenericSystemRowRenderer({
  actionName: 'boot',
  text: i18n.PACKAGE_INSTALLED,
});

export const systemRowRenderers: RowRenderer[] = [
  systemBootRowRenderer,
  systemErrorRowRenderer,
  systemErrorRowRendererDeprecated,
  systemExistingPackageRowRenderer,
  systemExistingRowRenderer,
  systemExistingSocketRowRenderer,
  systemExistingUserRowRenderer,
  systemHostChangedRowRenderer,
  systemInvalidRowRenderer,
  systemLoginRowRenderer,
  systemLogoutRowRenderer,
  systemPackageInstalledRowRenderer,
  systemProcessErrorRowRenderer,
  systemProcessStartedRowRenderer,
  systemProcessStoppedRowRenderer,
  systemSocketClosedRowRenderer,
  systemSocketOpenedRowRenderer,
  systemUserAddedRowRenderer,
  systemUserChangedRowRenderer,
];
