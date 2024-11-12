/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactElement } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiBasicTable,
  EuiBetaBadge,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';

export interface SectionItem {
  title: string;
  description: string | ReactElement;
}
export interface SectionConfig {
  title: string;
  items: SectionItem[];
  dataTestSubj: string;
}

interface SectionProps {
  section: SectionConfig;
}

export const OverallDetails: FC<{
  overallDetails: SectionConfig;
}> = ({ overallDetails }) => (
  <EuiFlexGroup alignItems="center" wrap data-test-subj={overallDetails.dataTestSubj}>
    {overallDetails.items.map((item) => {
      const key = item.title;
      if (item.title === 'badge') {
        return (
          <EuiFlexItem grow={false} key={key}>
            <EuiBetaBadge label={item.description} color="subdued" title={item.title} />
          </EuiFlexItem>
        );
      }

      return (
        <EuiFlexItem grow={false} key={key}>
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiDescriptionListDescription className="descriptionListTitle">
                <EuiText size="xs">{item.title}</EuiText>
              </EuiDescriptionListDescription>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiDescriptionListTitle className="descriptionListDescription">
                <EuiText size="s">
                  <h5>{item.description}</h5>
                </EuiText>
              </EuiDescriptionListTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      );
    })}
  </EuiFlexGroup>
);

export const Stats = ({ section }: { section: SectionConfig }) => (
  <EuiFlexGroup direction="column" gutterSize="s" data-test-subj={section.dataTestSubj}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <span>{section.title}</span>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup>
        {section.items.map((item) => (
          <EuiFlexItem grow={false} key={item.title}>
            <EuiDescriptionListDescription className="descriptionListTitle">
              <EuiText size="xs">{item.title}</EuiText>
            </EuiDescriptionListDescription>
            <EuiDescriptionListTitle className="descriptionListDescription">
              <EuiText size="xs">
                <h5>{item.description}</h5>
              </EuiText>
            </EuiDescriptionListTitle>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const Section: FC<SectionProps> = ({ section }) => {
  if (section?.items && section.items.length === 0) {
    return null;
  }

  const columns = [
    {
      field: 'title',
      name: i18n.translate(
        'xpack.ml.dataframe.analytics.expandedRowDetails.analysisStatsHeaderField',
        {
          defaultMessage: 'Field',
        }
      ),
    },
    {
      field: 'description',
      name: i18n.translate(
        'xpack.ml.dataframe.analytics.expandedRowDetails.analysisStatsHeaderValue',
        {
          defaultMessage: 'Value',
        }
      ),
      render: (v: SectionItem['description']) => <>{v}</>,
    },
  ];

  return (
    <div data-test-subj={section.dataTestSubj}>
      <EuiTitle size="xs">
        <span>{section.title}</span>
      </EuiTitle>
      <EuiBasicTable<SectionItem>
        compressed
        items={section.items}
        columns={columns}
        tableCaption={section.title}
        tableLayout="auto"
        data-test-subj={`${section.dataTestSubj}-table`}
      />
    </div>
  );
};

interface ExpandedRowDetailsPaneProps {
  overallDetails: SectionConfig;
  dataCounts: SectionConfig;
  memoryUsage: SectionConfig;
  analysisStats?: SectionConfig;
  progress: SectionConfig;
  dataTestSubj: string;
}

export const ExpandedRowDetailsPane: FC<ExpandedRowDetailsPaneProps> = ({
  analysisStats,
  dataCounts,
  memoryUsage,
  overallDetails,
  progress,
  dataTestSubj,
}) => {
  const {
    euiTheme: { size },
  } = useEuiTheme();

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup
        direction="column"
        css={{ padding: `${size.s} ${size.base} ${size.base}` }}
        data-test-subj={dataTestSubj}
        gutterSize="s"
      >
        {/* Top area */}
        <EuiFlexItem>
          <OverallDetails overallDetails={overallDetails} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem>
              <Stats section={dataCounts} />
            </EuiFlexItem>
            <EuiFlexItem>
              <Stats section={memoryUsage} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {/* END Top area */}
        <EuiFlexItem>
          <EuiHorizontalRule margin="xs" />
        </EuiFlexItem>
        {/* Bottom area */}
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={1} data-test-subj={progress.dataTestSubj}>
              <EuiSpacer size="s" />
              <EuiTitle size="xs">
                <span>{progress.title}</span>
              </EuiTitle>
              <EuiSpacer size="xs" />
              {progress.items.map((item) => (
                <span key={item.title}>
                  {item.description}
                  <EuiSpacer size="s" />
                </span>
              ))}
            </EuiFlexItem>
            <EuiFlexItem grow={3}>
              <EuiSpacer size="s" />
              {analysisStats ? <Section section={analysisStats} /> : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {/* END Bottom area */}
      </EuiFlexGroup>
    </>
  );
};
