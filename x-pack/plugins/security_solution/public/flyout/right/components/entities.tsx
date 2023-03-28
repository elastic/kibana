/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { useRightPanelContext } from '../context';
import { ENTITIES_TEST_ID } from './test_ids';
import { ENTITIES_TITLE } from './translations';
import { EntityPanel } from './entity_panel';
import { ENTITY_TYPE, getField } from './utils';
import { HostEntityContent } from './host_entity_content';
import { UserEntityContent } from './user_entity_content';
import { VIEW_ALL } from '../../shared/translations';
import { LeftPanelKey, LeftPanelEntitiesTabPath } from '../../left';

export const Entities: React.FC = () => {
  const { eventId, getFieldsData, indexName } = useRightPanelContext();

  const hostName = getField(getFieldsData('host.name'));
  const userName = getField(getFieldsData('user.name'), '-');
  const { openLeftPanel } = useExpandableFlyoutContext();

  const goToEntitiesTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: LeftPanelEntitiesTabPath,
      params: {
        id: eventId,
        indexName,
      },
    });
  }, [eventId, openLeftPanel, indexName]);

  if (!eventId) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xxxs">
        <EuiText>{ENTITIES_TITLE}</EuiText>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup data-test-subj={ENTITIES_TEST_ID} direction="column" gutterSize="s">
        <EuiFlexItem>
          {userName && (
            <EntityPanel
              title={userName}
              type={ENTITY_TYPE.user}
              content={<UserEntityContent userName={userName} />}
              expandable={false}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          {hostName && (
            <EntityPanel
              title={hostName}
              type={ENTITY_TYPE.host}
              content={<HostEntityContent hostName={hostName} />}
              expandable={false}
            />
          )}
        </EuiFlexItem>
        <EuiButtonEmpty onClick={goToEntitiesTab} iconType="arrowStart" iconSide="left" size="s">
          {VIEW_ALL(
            i18n.translate('xpack.securitySolution.flyout.documentDetails.overviewTab', {
              defaultMessage: 'entities',
            })
          )}
        </EuiButtonEmpty>
      </EuiFlexGroup>
    </>
  );
};
