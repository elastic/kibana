/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './expanded_row_details_pane.scss';

import React, { Fragment, FC, ReactElement } from 'react';

import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';

export interface SectionItem {
  title: string;
  description: string | ReactElement;
}
export interface SectionConfig {
  title: string;
  position: 'left' | 'right';
  items: SectionItem[];
}

interface SectionProps {
  section: SectionConfig;
}

export const Section: FC<SectionProps> = ({ section }) => {
  if (section.items.length === 0) {
    return null;
  }

  const columns = [
    {
      field: 'title',
      name: '',
      render: (v: SectionItem['title']) => <strong>{v}</strong>,
    },
    {
      field: 'description',
      name: '',
      render: (v: SectionItem['description']) => <>{v}</>,
    },
  ];

  return (
    <>
      <EuiTitle size="xs">
        <span>{section.title}</span>
      </EuiTitle>
      <EuiBasicTable<SectionItem>
        compressed
        items={section.items}
        columns={columns}
        tableCaption={section.title}
        tableLayout="auto"
        className="mlExpandedRowDetailsSection"
      />
    </>
  );
};

interface ExpandedRowDetailsPaneProps {
  sections: SectionConfig[];
}

export const ExpandedRowDetailsPane: FC<ExpandedRowDetailsPaneProps> = ({ sections }) => {
  return (
    <EuiFlexGroup className="mlExpandedRowDetails">
      <EuiFlexItem style={{ width: '50%' }}>
        {sections
          .filter((s) => s.position === 'left')
          .map((s) => (
            <Fragment key={s.title}>
              <EuiSpacer size="s" />
              <Section section={s} />
            </Fragment>
          ))}
      </EuiFlexItem>
      <EuiFlexItem style={{ width: '50%' }}>
        {sections
          .filter((s) => s.position === 'right')
          .map((s) => (
            <Fragment key={s.title}>
              <EuiSpacer size="s" />
              <Section section={s} />
            </Fragment>
          ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
