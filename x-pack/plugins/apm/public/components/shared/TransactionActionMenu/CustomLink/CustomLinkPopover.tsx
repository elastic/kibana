/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { CustomLink } from '../../../../../common/custom_link/custom_link_types';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { CustomLinkSection } from './CustomLinkSection';
import { ManageCustomLink } from './ManageCustomLink';
import { px } from '../../../../style/variables';

const ScrollableContainer = styled.div`
  -ms-overflow-style: none;
  max-height: ${px(535)};
  overflow: scroll;
`;

export const CustomLinkPopover = ({
  customLinks,
  onCreateCustomLinkClick,
  onClose,
  transaction,
}: {
  customLinks: CustomLink[];
  onCreateCustomLinkClick: () => void;
  onClose: () => void;
  transaction: Transaction;
}) => {
  return (
    <>
      <EuiPopoverTitle>
        <EuiFlexGroup>
          <EuiFlexItem style={{ alignItems: 'flex-start' }}>
            <EuiButtonEmpty
              color="text"
              size="xs"
              onClick={onClose}
              iconType="arrowLeft"
              style={{ fontWeight: 'bold' }}
              flush="left"
            >
              {i18n.translate(
                'xpack.apm.transactionActionMenu.customLink.popover.title',
                {
                  defaultMessage: 'CUSTOM LINKS',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <ManageCustomLink
              onCreateCustomLinkClick={onCreateCustomLinkClick}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <ScrollableContainer>
        <CustomLinkSection
          customLinks={customLinks}
          transaction={transaction}
        />
      </ScrollableContainer>
    </>
  );
};
