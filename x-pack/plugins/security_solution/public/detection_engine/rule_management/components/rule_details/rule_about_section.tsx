/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash/fp';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiIcon,
  EuiText,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import type {
  SeverityMappingItem as SeverityMappingItemType,
  RiskScoreMappingItem as RiskScoreMappingItemType,
  Threats,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { ALERT_RISK_SCORE } from '@kbn/rule-data-utils';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas';
import { SeverityBadge } from '../../../../detections/components/rules/severity_badge';
import { defaultToEmptyTag } from '../../../../common/components/empty_value';
import { filterEmptyThreats } from '../../../rule_creation_ui/pages/rule_creation/helpers';
import { ThreatEuiFlexGroup } from '../../../../detections/components/rules/description_step/threat_description';

import { BadgeList } from './badge_list';
import * as i18n from './translations';

const OverrideColumn = styled(EuiFlexItem)`
  width: 125px;
  max-width: 125px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const OverrideValueColumn = styled(EuiFlexItem)`
  width: 30px;
  max-width: 30px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledEuiLink = styled(EuiLink)`
  word-break: break-word;
`;

interface DescriptionProps {
  description: string;
}

const Description = ({ description }: DescriptionProps) => (
  <EuiText size="s">{description}</EuiText>
);

interface AuthorProps {
  author: string[];
}

const Author = ({ author }: AuthorProps) => <BadgeList badges={author} />;

const BuildingBlock = () => <EuiText size="s">{i18n.BUILDING_BLOCK_FIELD_DESCRIPTION}</EuiText>;

interface SeverityMappingItemProps {
  severityMappingItem: SeverityMappingItemType;
}

const SeverityMappingItem = ({ severityMappingItem }: SeverityMappingItemProps) => (
  <EuiFlexGroup alignItems="center" gutterSize="s">
    <OverrideColumn>
      <EuiToolTip
        content={severityMappingItem.field}
        data-test-subj={`severityOverrideField-${severityMappingItem.value}`}
      >
        <>{`${severityMappingItem.field}:`}</>
      </EuiToolTip>
    </OverrideColumn>
    <OverrideValueColumn>
      <EuiToolTip
        content={severityMappingItem.value}
        data-test-subj={`severityOverrideValue-${severityMappingItem.value}`}
      >
        {defaultToEmptyTag(severityMappingItem.value)}
      </EuiToolTip>
    </OverrideValueColumn>
    <EuiFlexItem grow={false}>
      <EuiIcon type={'sortRight'} />
    </EuiFlexItem>
    <EuiFlexItem>
      <SeverityBadge
        data-test-subj={`severityOverrideSeverity-${severityMappingItem.value}`}
        value={severityMappingItem.severity}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface RiskScoreProps {
  riskScore: number;
}

const RiskScore = ({ riskScore }: RiskScoreProps) => <EuiText size="s">{riskScore}</EuiText>;

interface RiskScoreMappingItemProps {
  riskScoreMappingItem: RiskScoreMappingItemType;
}

const RiskScoreMappingItem = ({ riskScoreMappingItem }: RiskScoreMappingItemProps) => (
  <EuiFlexGroup alignItems="center" gutterSize="s">
    <OverrideColumn>
      <EuiToolTip
        content={riskScoreMappingItem.field}
        data-test-subj={`riskScoreOverrideField-${riskScoreMappingItem.value}`}
      >
        <>{riskScoreMappingItem.field}</>
      </EuiToolTip>
    </OverrideColumn>
    <EuiFlexItem grow={false}>
      <EuiIcon type={'sortRight'} />
    </EuiFlexItem>
    <EuiFlexItem>{ALERT_RISK_SCORE}</EuiFlexItem>
  </EuiFlexGroup>
);

interface ReferencesProps {
  references: string[];
}

const References = ({ references }: ReferencesProps) => (
  <EuiText size="s">
    <ul>
      {references
        .filter((reference) => !isEmpty(reference))
        .map((reference, index) => (
          <li data-test-subj="urlsDescriptionReferenceLinkItem" key={`${index}-${reference}`}>
            <StyledEuiLink href={reference} external target="_blank">
              {reference}
            </StyledEuiLink>
          </li>
        ))}
    </ul>
  </EuiText>
);

const FalsePositives = ({ falsePositives }: { falsePositives: string[] }) => (
  <EuiText size="s">
    <ul>
      {falsePositives.map((falsePositivesItem) => (
        <li
          data-test-subj="unorderedListArrayDescriptionItem"
          key={`falsePositives-${falsePositivesItem}`}
        >
          {falsePositivesItem}
        </li>
      ))}
    </ul>
  </EuiText>
);

interface LicenseProps {
  license: string;
}

const License = ({ license }: LicenseProps) => <EuiText size="s">{license}</EuiText>;

interface RuleNameOverrideProps {
  ruleNameOverride: string;
}

const RuleNameOverride = ({ ruleNameOverride }: RuleNameOverrideProps) => (
  <EuiText size="s">{ruleNameOverride}</EuiText>
);

interface ThreatProps {
  threat: Threats;
}

const Threat = ({ threat }: ThreatProps) => (
  <ThreatEuiFlexGroup threat={filterEmptyThreats(threat)} label="" />
);

interface ThreatIndicatorPathProps {
  threatIndicatorPath: string;
}

const ThreatIndicatorPath = ({ threatIndicatorPath }: ThreatIndicatorPathProps) => (
  <EuiText size="s">{threatIndicatorPath}</EuiText>
);

interface TimestampOverrideProps {
  timestampOverride: string;
}

const TimestampOverride = ({ timestampOverride }: TimestampOverrideProps) => (
  <EuiText size="s">{timestampOverride}</EuiText>
);

interface TagsProps {
  tags: string[];
}

const Tags = ({ tags }: TagsProps) => <BadgeList badges={tags} />;

// eslint-disable-next-line complexity
const prepareAboutSectionListItems = (
  rule: Partial<RuleResponse>
): EuiDescriptionListProps['listItems'] => {
  const aboutSectionListItems: EuiDescriptionListProps['listItems'] = [];

  if (rule.author) {
    aboutSectionListItems.push({
      title: i18n.AUTHOR_FIELD_LABEL,
      description: <Author author={rule.author} />,
    });
  }

  if (rule.building_block_type) {
    aboutSectionListItems.push({
      title: i18n.BUILDING_BLOCK_FIELD_LABEL,
      description: <BuildingBlock />,
    });
  }

  if (rule.severity) {
    aboutSectionListItems.push({
      title: i18n.SEVERITY_FIELD_LABEL,
      description: <SeverityBadge value={rule.severity} />,
    });
  }

  if (rule.severity_mapping && rule.severity_mapping.length > 0) {
    aboutSectionListItems.push(
      ...rule.severity_mapping
        .filter((severityMappingItem) => severityMappingItem.field !== '')
        .map((severityMappingItem, index) => {
          return {
            title: index === 0 ? i18n.SEVERITY_MAPPING_FIELD_LABEL : '',
            description: <SeverityMappingItem severityMappingItem={severityMappingItem} />,
          };
        })
    );
  }

  if (rule.risk_score) {
    aboutSectionListItems.push({
      title: i18n.RISK_SCORE_FIELD_LABEL,
      description: <RiskScore riskScore={rule.risk_score} />,
    });
  }

  if (rule.risk_score_mapping && rule.risk_score_mapping.length > 0) {
    aboutSectionListItems.push(
      ...rule.risk_score_mapping
        .filter((riskScoreMappingItem) => riskScoreMappingItem.field !== '')
        .map((riskScoreMappingItem, index) => {
          return {
            title: index === 0 ? i18n.RISK_SCORE_MAPPING_FIELD_LABEL : '',
            description: <RiskScoreMappingItem riskScoreMappingItem={riskScoreMappingItem} />,
          };
        })
    );
  }

  if (rule.references && rule.references.length > 0) {
    aboutSectionListItems.push({
      title: i18n.REFERENCES_FIELD_LABEL,
      description: <References references={rule.references} />,
    });
  }

  if (rule.false_positives && rule.false_positives.length > 0) {
    aboutSectionListItems.push({
      title: i18n.FALSE_POSITIVES_FIELD_LABEL,
      description: <FalsePositives falsePositives={rule.false_positives} />,
    });
  }

  if (rule.license) {
    aboutSectionListItems.push({
      title: i18n.LICENSE_FIELD_LABEL,
      description: <License license={rule.license} />,
    });
  }

  if (rule.rule_name_override) {
    aboutSectionListItems.push({
      title: i18n.RULE_NAME_OVERRIDE_FIELD_LABEL,
      description: <RuleNameOverride ruleNameOverride={rule.rule_name_override} />,
    });
  }

  if (rule.threat && rule.threat.length > 0) {
    aboutSectionListItems.push({
      title: i18n.THREAT_FIELD_LABEL,
      description: <Threat threat={rule.threat} />,
    });
  }

  if ('threat_indicator_path' in rule && rule.threat_indicator_path) {
    aboutSectionListItems.push({
      title: i18n.THREAT_INDICATOR_PATH_LABEL,
      description: <ThreatIndicatorPath threatIndicatorPath={rule.threat_indicator_path} />,
    });
  }

  if (rule.timestamp_override) {
    aboutSectionListItems.push({
      title: i18n.TIMESTAMP_OVERRIDE_FIELD_LABEL,
      description: <TimestampOverride timestampOverride={rule.timestamp_override} />,
    });
  }

  if (rule.tags && rule.tags.length > 0) {
    aboutSectionListItems.push({
      title: i18n.TAGS_FIELD_LABEL,
      description: <Tags tags={rule.tags} />,
    });
  }

  return aboutSectionListItems;
};

export interface RuleAboutSectionProps {
  rule: Partial<RuleResponse>;
}

export const RuleAboutSection = ({ rule }: RuleAboutSectionProps) => {
  const aboutSectionListItems = prepareAboutSectionListItems(rule);

  return (
    <div>
      {rule.description && (
        <EuiDescriptionList
          listItems={[
            {
              title: i18n.DESCRIPTION_FIELD_LABEL,
              description: <Description description={rule.description} />,
            },
          ]}
        />
      )}
      <EuiSpacer size="m" />
      <EuiDescriptionList type="column" listItems={aboutSectionListItems} />
    </div>
  );
};
