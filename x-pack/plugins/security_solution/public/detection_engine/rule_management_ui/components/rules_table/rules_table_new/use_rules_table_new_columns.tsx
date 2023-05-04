/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableActionsColumnType } from '@elastic/eui';
import { EuiBadge, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import {
  DEFAULT_RELATIVE_DATE_THRESHOLD,
  SecurityPageName,
  SHOW_RELATED_INTEGRATIONS_SETTING,
} from '../../../../../../common/constants';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import { SecuritySolutionLinkAnchor } from '../../../../../common/components/links';
import { getRuleDetailsTabUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { PopoverItems } from '../../../../../common/components/popover_items';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import { IntegrationsPopover } from '../../../../../detections/components/rules/related_integrations/integrations_popover';
import { SeverityBadge } from '../../../../../detections/components/rules/severity_badge';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { RuleDetailTabs } from '../../../../rule_details_ui/pages/rule_details';
import type { Rule } from '../../../../rule_management/logic';
import type { RuleInstallationInfoForReview } from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_installation/response_schema';

export type TableColumn =
  | EuiBasicTableColumn<RuleInstallationInfoForReview>
  | EuiTableActionsColumnType<RuleInstallationInfoForReview>;

interface ColumnsProps {
  hasCRUDPermissions: boolean;
}

// TODO: Shall we direct link to the docs for the rule?
export const RuleLink = ({ name, id }: Pick<Rule, 'id' | 'name'>) => {
  return (
    <EuiToolTip content={name} anchorClassName="eui-textTruncate">
      <SecuritySolutionLinkAnchor
        data-test-subj="ruleName"
        deepLinkId={SecurityPageName.rules}
        path={getRuleDetailsTabUrl(id, RuleDetailTabs.alerts)}
      >
        {name}
      </SecuritySolutionLinkAnchor>
    </EuiToolTip>
  );
};

const useRuleNameColumn = (): TableColumn => {
  return useMemo(
    () => ({
      field: 'name',
      name: i18n.COLUMN_RULE,
      render: (
        value: RuleInstallationInfoForReview['rule_id'],
        item: RuleInstallationInfoForReview
      ) => <RuleLink id={value} name={value} />,
      sortable: true,
      truncateText: true,
      width: '38%',
    }),
    []
  );
};

const TAGS_COLUMN: TableColumn = {
  field: 'tags',
  name: null,
  align: 'center',
  render: (tags: Rule['tags']) => {
    if (tags == null || tags.length === 0) {
      return null;
    }

    const renderItem = (tag: string, i: number) => (
      <EuiBadge color="hollow" key={`${tag}-${i}`} data-test-subj="tag">
        {tag}
      </EuiBadge>
    );
    return (
      <PopoverItems
        items={tags}
        popoverTitle={i18n.COLUMN_TAGS}
        popoverButtonTitle={tags.length.toString()}
        popoverButtonIcon="tag"
        dataTestPrefix="tags"
        renderItem={renderItem}
      />
    );
  },
  width: '65px',
  truncateText: true,
};

const INTEGRATIONS_COLUMN: TableColumn = {
  field: 'related_integrations',
  name: null,
  align: 'center',
  render: (integrations: Rule['related_integrations']) => {
    if (integrations == null || integrations.length === 0) {
      return null;
    }

    return <IntegrationsPopover relatedIntegrations={integrations} />;
  },
  width: '143px',
  truncateText: true,
};

// const useActionsColumn = (): EuiTableActionsColumnType<Rule> => {
//   const actions = useRulesTableActions();
//
//   return useMemo(() => ({ actions, width: '40px' }), [actions]);
// };

export const useRulesTableNewColumns = ({ hasCRUDPermissions }: ColumnsProps): TableColumn[] => {
  const ruleNameColumn = useRuleNameColumn();
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);

  return useMemo(
    () => [
      ruleNameColumn,
      ...(showRelatedIntegrations ? [INTEGRATIONS_COLUMN] : []),
      TAGS_COLUMN,
      {
        field: 'risk_score',
        name: i18n.COLUMN_RISK_SCORE,
        render: (value: Rule['risk_score']) => (
          <EuiText data-test-subj="riskScore" size="s">
            {value}
          </EuiText>
        ),
        sortable: true,
        truncateText: true,
        width: '85px',
      },
      {
        field: 'severity',
        name: i18n.COLUMN_SEVERITY,
        render: (value: Rule['severity']) => <SeverityBadge value={value} />,
        sortable: true,
        truncateText: true,
        width: '12%',
      },
      {
        field: 'updated_at',
        name: i18n.COLUMN_LAST_UPDATE,
        render: (value: Rule['updated_at']) => {
          return value == null ? (
            getEmptyTagValue()
          ) : (
            <FormattedRelativePreferenceDate
              tooltipFieldName={i18n.COLUMN_LAST_UPDATE}
              relativeThresholdInHrs={DEFAULT_RELATIVE_DATE_THRESHOLD}
              value={value}
              tooltipAnchorClassName="eui-textTruncate"
            />
          );
        },
        sortable: true,
        width: '18%',
        truncateText: true,
      },
      // ...(hasCRUDPermissions ? [actionsColumn] : []),
    ],
    [hasCRUDPermissions, ruleNameColumn, showRelatedIntegrations]
  );
};
