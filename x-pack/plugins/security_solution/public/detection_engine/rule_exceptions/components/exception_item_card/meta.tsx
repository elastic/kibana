/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import type { EuiContextMenuPanelProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiText,
  EuiButtonEmpty,
  EuiPopover,
} from '@elastic/eui';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import styled from 'styled-components';

import * as i18n from './translations';
import { FormattedDate } from '../../../../common/components/formatted_date';
import { SecurityPageName } from '../../../../../common/constants';
import type { ExceptionListRuleReferencesSchema } from '../../../../../common/detection_engine/rule_exceptions';
import { SecuritySolutionLinkAnchor } from '../../../../common/components/links';
import { RuleDetailTabs } from '../../../rule_details_ui/pages/rule_details';
import { getRuleDetailsTabUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';

const StyledFlexItem = styled(EuiFlexItem)`
  border-right: 1px solid #d3dae6;
  padding: 4px 12px 4px 0;
`;

export interface ExceptionItemCardMetaInfoProps {
  item: ExceptionListItemSchema;
  listAndReferences: ExceptionListRuleReferencesSchema | null;
  dataTestSubj: string;
}

export const ExceptionItemCardMetaInfo = memo<ExceptionItemCardMetaInfoProps>(
  ({ item, listAndReferences, dataTestSubj }) => {
    const [isListsPopoverOpen, setIsListsPopoverOpen] = useState(false);
    const [isRulesPopoverOpen, setIsRulesPopoverOpen] = useState(false);

    const onAffectedRulesClick = () => setIsRulesPopoverOpen((isOpen) => !isOpen);
    const onAffectedListsClick = () => setIsListsPopoverOpen((isOpen) => !isOpen);
    const onCloseRulesPopover = () => setIsRulesPopoverOpen(false);
    const onClosListsPopover = () => setIsListsPopoverOpen(false);

    const itemActions = useMemo((): EuiContextMenuPanelProps['items'] => {
      if (listAndReferences == null) {
        return [];
      }
      return listAndReferences.referenced_rules.map((reference) => (
        <EuiContextMenuItem
          data-test-subj={`${dataTestSubj}-rulesAffected-${reference.id}`}
          key={reference.id}
        >
          <EuiToolTip content={reference.name} anchorClassName="eui-textTruncate">
            <SecuritySolutionLinkAnchor
              data-test-subj="ruleName"
              deepLinkId={SecurityPageName.rules}
              path={getRuleDetailsTabUrl(reference.id, RuleDetailTabs.alerts)}
              external
            >
              {reference.name}
            </SecuritySolutionLinkAnchor>
          </EuiToolTip>
        </EuiContextMenuItem>
      ));
    }, [listAndReferences, dataTestSubj]);

    const rulesAffected = useMemo((): JSX.Element => {
      if (listAndReferences == null) return <></>;

      return (
        <StyledFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButtonEmpty
                onClick={onAffectedRulesClick}
                iconType="list"
                data-test-subj={`${dataTestSubj}-affectedRulesButton`}
              >
                {i18n.AFFECTED_RULES(listAndReferences?.referenced_rules.length ?? 0)}
              </EuiButtonEmpty>
            }
            panelPaddingSize="none"
            isOpen={isRulesPopoverOpen}
            closePopover={onCloseRulesPopover}
            data-test-subj={`${dataTestSubj}-rulesPopover`}
            id={'rulesPopover'}
          >
            <EuiContextMenuPanel size="s" items={itemActions} />
          </EuiPopover>
        </StyledFlexItem>
      );
    }, [listAndReferences, dataTestSubj, isRulesPopoverOpen, itemActions]);

    const listsAffected = useMemo((): JSX.Element => {
      if (listAndReferences == null) return <></>;

      if (listAndReferences.type !== ExceptionListTypeEnum.RULE_DEFAULT) {
        return (
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonEmpty
                  onClick={onAffectedListsClick}
                  iconType="list"
                  data-test-subj={`${dataTestSubj}-affectedListsButton`}
                >
                  {i18n.AFFECTED_LIST}
                </EuiButtonEmpty>
              }
              panelPaddingSize="none"
              isOpen={isListsPopoverOpen}
              closePopover={onClosListsPopover}
              data-test-subj={`${dataTestSubj}-listsPopover`}
              id={'listsPopover'}
            >
              <EuiContextMenuPanel
                size="s"
                items={[
                  <EuiContextMenuItem
                    data-test-subj={`${dataTestSubj}-listsAffected-${listAndReferences.id}`}
                    key={listAndReferences.id}
                  >
                    <EuiToolTip content={listAndReferences.name} anchorClassName="eui-textTruncate">
                      <SecuritySolutionLinkAnchor
                        data-test-subj="ruleName"
                        deepLinkId={SecurityPageName.exceptions}
                        // TODO: Update to list details URL once available
                        path={`/details/${listAndReferences?.list_id}`}
                        external
                      >
                        {listAndReferences.name}
                      </SecuritySolutionLinkAnchor>
                    </EuiToolTip>
                  </EuiContextMenuItem>,
                ]}
              />
            </EuiPopover>
          </EuiFlexItem>
        );
      } else {
        return <></>;
      }
    }, [listAndReferences, dataTestSubj, isListsPopoverOpen]);

    return (
      <EuiFlexGroup
        alignItems="center"
        responsive={false}
        gutterSize="s"
        data-test-subj={dataTestSubj}
      >
        <StyledFlexItem grow={false}>
          <MetaInfoDetails
            fieldName="created_by"
            label={i18n.EXCEPTION_ITEM_CREATED_LABEL}
            value1={<FormattedDate fieldName="created_at" value={item.created_at} />}
            value2={item.created_by}
            dataTestSubj={`${dataTestSubj}-createdBy`}
          />
        </StyledFlexItem>
        <StyledFlexItem grow={false}>
          <MetaInfoDetails
            fieldName="updated_by"
            label={i18n.EXCEPTION_ITEM_UPDATED_LABEL}
            value1={<FormattedDate fieldName="updated_at" value={item.updated_at} />}
            value2={item.updated_by}
            dataTestSubj={`${dataTestSubj}-updatedBy`}
          />
        </StyledFlexItem>
        {listAndReferences != null && (
          <>
            {rulesAffected}
            {listsAffected}
          </>
        )}
      </EuiFlexGroup>
    );
  }
);
ExceptionItemCardMetaInfo.displayName = 'ExceptionItemCardMetaInfo';

interface MetaInfoDetailsProps {
  fieldName: string;
  label: string;
  value1: JSX.Element | string;
  value2: string;
  dataTestSubj: string;
}

const MetaInfoDetails = memo<MetaInfoDetailsProps>(({ label, value1, value2, dataTestSubj }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false} responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" style={{ fontFamily: 'Inter' }}>
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false} data-test-subj={`${dataTestSubj}-value1`}>
        <EuiBadge color="default" style={{ fontFamily: 'Inter' }}>
          {value1}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" style={{ fontFamily: 'Inter' }}>
          {i18n.EXCEPTION_ITEM_META_BY}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false} data-test-subj={`${dataTestSubj}-value2`}>
        <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center" wrap={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" style={{ fontFamily: 'Inter' }}>
              {value2}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

MetaInfoDetails.displayName = 'MetaInfoDetails';
