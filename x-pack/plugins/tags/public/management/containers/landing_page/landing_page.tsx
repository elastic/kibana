/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { EuiButton, EuiInMemoryTable } from '@elastic/eui';
import { Page } from '../../components/page';
import { txtTitle, txtSubtitle, txtCreateATag } from './i18n';
import { Tag } from '../../../../common';

export const LandingPage: React.FC = () => {
  return (
    <Page
      id={'TagTable'}
      title={txtTitle}
      subtitle={<p>{txtSubtitle}</p>}
      callToAction={
        <Link to={'/create'}>
          <EuiButton fill>{txtCreateATag}</EuiButton>
        </Link>
      }
    >
      <EuiInMemoryTable<Tag>
        itemId={'id'}
        items={[
          {
            id: 'foo',
            title: 'Hello',
            description: 'lol',
            color: '',
            createdAt: '',
            createdBy: '',
            enabled: true,
            key: '',
            value: '',
            updatedAt: '',
            updatedBy: '',
          },
        ]}
        columns={[
          {
            field: 'title',
            name: 'Tag',
            sortable: true,
            render: (value: string, record: Tag) => <div>{value}</div>,
          },
          {
            field: 'description',
            name: 'Description',
            sortable: true,
          },
        ]}
        hasActions
        pagination={true}
        sorting={true}
        search={{
          box: {
            placeholder: 'Search',
          },
        }}
        loading={false}
        message={undefined}
      />
    </Page>
  );
};
