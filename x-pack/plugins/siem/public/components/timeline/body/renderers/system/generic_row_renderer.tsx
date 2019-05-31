/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';

import * as i18n from './translations';
import { RowRenderer, RowRendererContainer } from '../row_renderer';
import { Row } from '../helpers';
import { SystemGenericDetails } from './generic_details';
import { SystemGenericFileDetails } from './generic_file_details';

export const createGenericSystemRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  isInstance: ecs => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    const action: string | null | undefined = get('event.action[0]', ecs);
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
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  isInstance: ecs => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    const action: string | null | undefined = get('event.action[0]', ecs);
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

const systemExistingPackageRowRenderer = createGenericSystemRowRenderer({
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

// TODO: Remove this once this has been replaced everywhere with "error" below
const systemErrorRowRendererDeprecated = createGenericSystemRowRenderer({
  actionName: 'error:',
  text: i18n.ERROR,
});

const systemErrorRowRenderer = createGenericSystemRowRenderer({
  actionName: 'error',
  text: i18n.ERROR,
});

const systemPackageInstalledRowRenderer = createGenericSystemRowRenderer({
  actionName: 'package_installed',
  text: i18n.PACKAGE_INSTALLED,
});

const systemBootRowRenderer = createGenericSystemRowRenderer({
  actionName: 'boot',
  text: i18n.BOOT,
});

const systemAcceptedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'accepted',
  text: i18n.ACCEPTED,
});

const systemPackageUpdatedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'package_updated',
  text: i18n.PACKAGE_UPDATED,
});

const systemPackageRemovedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'package_removed',
  text: i18n.PACKAGE_REMOVED,
});

const systemUserRemovedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_removed',
  text: i18n.USER_REMOVED,
});

export const systemRowRenderers: RowRenderer[] = [
  systemAcceptedRowRenderer,
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
  systemPackageUpdatedRowRenderer,
  systemPackageRemovedRowRenderer,
  systemProcessErrorRowRenderer,
  systemProcessStartedRowRenderer,
  systemProcessStoppedRowRenderer,
  systemSocketClosedRowRenderer,
  systemSocketOpenedRowRenderer,
  systemUserAddedRowRenderer,
  systemUserChangedRowRenderer,
  systemUserRemovedRowRenderer,
];
