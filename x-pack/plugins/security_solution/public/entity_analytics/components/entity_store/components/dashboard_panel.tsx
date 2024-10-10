/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiToolTip,
  EuiButton,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiText,
} from '@elastic/eui';

import { Panel } from '../../../../common/components/panel';
import { HeaderSection } from '../../../../common/components/header_section';
import { EntityAnalyticsLearnMoreLink } from '../../risk_score_onboarding/entity_analytics_doc_link';
import { EntitiesList } from '../entities_list';

const EntityStoreDashboardPanelComponent = () => {
  const [visibleModal, setModalVisibility] = useState(false);

  if (false) {
    return <EntitiesList />;
  }

  return (
    <>
      <Panel hasBorder data-test-subj={`entity_analytics_entity_store`}>
        <HeaderSection title={'Entity Store'} titleSize="s" />
        <EuiEmptyPrompt
          title={<h2>{'Placeholder title'}</h2>}
          body={
            <>
              {'Placeholder text'}
              <EntityAnalyticsLearnMoreLink />
            </>
          }
          actions={
            <EuiToolTip content={'Enable Entity Store'}>
              <EuiButton
                color="primary"
                fill
                onClick={() => setModalVisibility(true)}
                data-test-subj={`enable_entity_store_btn`}
              >
                {'Enable'}
              </EuiButton>
            </EuiToolTip>
          }
        />
      </Panel>
      {visibleModal && (
        <EuiModal onClose={() => setModalVisibility(false)}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{'Enable Store'}</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiText>
              <p>{'Enable store body'}</p>
            </EuiText>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButton onClick={() => setModalVisibility(false)} fill>
              {'Go'}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};

export const EntityStoreDashboardPanel = React.memo(EntityStoreDashboardPanelComponent);
EntityStoreDashboardPanel.displayName = 'EntityStoreDashboardPanel';
