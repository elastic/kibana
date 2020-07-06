/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { EuiInMemoryTable, EuiButton, EuiButtonIcon, EuiTextColor, EuiLink } from '@elastic/eui';
import { Link } from 'react-router-dom';
import { RawTagWithId } from '../../../../common';
import { useServices } from '../../context';
import {
  txtTag,
  txtTitle,
  txtDescription,
  txtActions,
  txtEditSomething,
  txtDeleteSomething,
} from './i18n';
import { Tag } from '../../../components/tag';

const pagination = {
  initialPageSize: 25,
  pageSizeOptions: [25, 100],
};

export const TagTable: React.FC = () => {
  const { manager } = useServices();
  const initializing = manager.useInitializing();
  const tagMap = manager.useTags();
  const tags = useMemo(() => Object.values(tagMap).map(({ data }) => data), [tagMap]);
  const [selection, onSelectionChange] = useState<RawTagWithId[]>([]);

  return (
    <EuiInMemoryTable<RawTagWithId>
      itemId={'id'}
      items={tags}
      columns={[
        {
          field: 'title',
          name: txtTitle,
          truncateText: true,
          sortable: (tag) => tag.title.toLowerCase(),
          render: (value: string, tag: RawTagWithId) => (
            <Link to={`/edit/${tag.id}`}>
              <EuiLink>{tag.title}</EuiLink>
            </Link>
          ),
        },
        {
          name: txtTag,
          render: (tag: RawTagWithId) => (
            <Link to={`/edit/${tag.id}`}>
              <Tag tag={tag} />
            </Link>
          ),
        },
        {
          field: 'description',
          name: txtDescription,
          truncateText: true,
          sortable: true,
          render: (value: string, record: RawTagWithId) => (
            <EuiTextColor color="subdued">{record.description}</EuiTextColor>
          ),
        },
        {
          name: txtActions,
          actions: [
            {
              render: (tag) => (
                <Link to={`/edit/${tag.id}`}>
                  <EuiButtonIcon
                    aria-label={txtEditSomething(tag.title)}
                    color={'primary'}
                    iconType={'pencil'}
                  />
                </Link>
              ),
            },
            {
              render: (tag) => (
                <EuiButtonIcon
                  aria-label={txtDeleteSomething(tag.title)}
                  color={'danger'}
                  iconType={'trash'}
                  onClick={() => manager.delete$([tag.id])}
                />
              ),
            },
          ],
        },
      ]}
      hasActions
      pagination={pagination}
      sorting={{
        sort: {
          field: 'title',
          direction: 'asc',
        },
      }}
      search={{
        box: {
          placeholder: 'Search',
        },
        toolsLeft: !selection.length ? undefined : (
          <EuiButton
            color="danger"
            iconType="trash"
            onClick={() => manager.delete$(selection.map(({ id }) => id))}
          >
            Delete {selection.length} tags
          </EuiButton>
        ),
      }}
      loading={initializing}
      message={undefined}
      selection={{
        onSelectionChange,
        selectable: () => true,
      }}
    />
  );
};
