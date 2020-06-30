/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiText,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { isEmpty } from 'lodash';
import { CustomLink as CustomLinkType } from '../../../../../common/custom_link/custom_link_types';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import {
  ActionMenuDivider,
  SectionSubtitle,
} from '../../../../../../observability/public';
import { CustomLinkSection } from './CustomLinkSection';
import { ManageCustomLink } from './ManageCustomLink';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import { LoadingStatePrompt } from '../../LoadingStatePrompt';
import { px } from '../../../../style/variables';

const SeeMoreButton = styled.button<{ show: boolean }>`
  display: ${(props) => (props.show ? 'flex' : 'none')};
  align-items: center;
  width: 100%;
  justify-content: space-between;
  &:hover {
    text-decoration: underline;
  }
`;

export const CustomLink = ({
  customLinks,
  status,
  onCreateCustomLinkClick,
  onSeeMoreClick,
  transaction,
}: {
  customLinks: CustomLinkType[];
  status: FETCH_STATUS;
  onCreateCustomLinkClick: () => void;
  onSeeMoreClick: () => void;
  transaction: Transaction;
}) => {
  const renderEmptyPrompt = (
    <>
      <EuiText size="xs" grow={false} style={{ width: px(300) }}>
        {i18n.translate('xpack.apm.customLink.empty', {
          defaultMessage:
            'No custom links found. Set up your own custom links, e.g., a link to a specific Dashboard or external link.',
        })}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        iconType="plusInCircle"
        size="xs"
        onClick={onCreateCustomLinkClick}
      >
        {i18n.translate('xpack.apm.customLink.buttom.create', {
          defaultMessage: 'Create custom link',
        })}
      </EuiButtonEmpty>
    </>
  );

  const renderCustomLinkBottomSection = isEmpty(customLinks) ? (
    renderEmptyPrompt
  ) : (
    <SeeMoreButton onClick={onSeeMoreClick} show={customLinks.length > 3}>
      <EuiText size="s">
        {i18n.translate('xpack.apm.transactionActionMenu.customLink.seeMore', {
          defaultMessage: 'See more',
        })}
      </EuiText>
      <EuiIcon type="arrowRight" />
    </SeeMoreButton>
  );

  return (
    <>
      <ActionMenuDivider />
      <EuiFlexGroup>
        <EuiFlexItem style={{ justifyContent: 'center' }}>
          <EuiText size={'s'} grow={false}>
            <h5>
              {i18n.translate(
                'xpack.apm.transactionActionMenu.customLink.section',
                {
                  defaultMessage: 'Custom Links',
                }
              )}
            </h5>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <ManageCustomLink
            onCreateCustomLinkClick={onCreateCustomLinkClick}
            showCreateCustomLinkButton={!!customLinks.length}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <SectionSubtitle>
        {i18n.translate('xpack.apm.transactionActionMenu.customLink.subtitle', {
          defaultMessage: 'Links will open in a new window.',
        })}
      </SectionSubtitle>
      <CustomLinkSection
        customLinks={customLinks.slice(0, 3)}
        transaction={transaction}
      />
      <EuiSpacer size="s" />
      {status === FETCH_STATUS.LOADING ? (
        <LoadingStatePrompt />
      ) : (
        renderCustomLinkBottomSection
      )}
    </>
  );
};
