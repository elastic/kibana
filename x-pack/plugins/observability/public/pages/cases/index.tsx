/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import styled from 'styled-components';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { RouteParams } from '../../routes';
import { ExploratoryViewModal } from '../../components/shared/exploratory_view/modal';
import { TypedLensByValueInput } from '../../../../lens/public';
import { ObservabilityPublicPluginsStart } from '../../plugin';

interface CasesProps {
  routeParams: RouteParams<'/cases'>;
}

export function CasesPage(props: CasesProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [lensAttributes, setLensAttributes] = useState<TypedLensByValueInput['attributes'] | null>(
    null
  );

  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  const {
    services: { lens },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const LensComponent = lens?.EmbeddableComponent;

  return (
    <EuiPageTemplate
      pageHeader={{
        pageTitle: (
          <>
            {i18n.translate('xpack.observability.casesTitle', { defaultMessage: 'Cases' })}{' '}
            <ExperimentalBadge />
          </>
        ),
      }}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText>
            <EuiTitle>
              <h2>Case 1</h2>
            </EuiTitle>

            <EuiButton onClick={showModal}>Add visualization</EuiButton>
            {lensAttributes && (
              <Wrapper>
                <LensComponent
                  id="exploratoryView"
                  timeRange={{ from: 'now-15m', to: 'now' }}
                  attributes={lensAttributes}
                />
              </Wrapper>
            )}
            {isModalVisible && (
              <ExploratoryViewModal
                isOpen={isModalVisible}
                onClose={(val) => {
                  setLensAttributes(val);
                  closeModal();
                }}
              />
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate>
  );
}

const Wrapper = styled.div`
  height: 500px;
  &&& {
    > div {
      height: 100%;
    }
    > :nth-child(2) {
      height: calc(100% - 56px);
    }
  }
`;
