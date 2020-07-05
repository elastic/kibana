/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSideNav, EuiPanel, EuiHorizontalRule } from '@elastic/eui';
import { useTagsApp } from '../../../../context';
import { Tag as TagUi } from '../../../../../containers/tag';
import { TagPicker } from '../../../../../containers/tag_picker';
import { Tag } from '../../../../../services/tags_service/tag_manager/tag';
import { ResultsList } from './results_list';

export const LandinPage: React.FC = () => {
  const { manager } = useTagsApp();
  const tags = manager.useTagsList();
  const [selected, setSelected] = useState<string[]>([]);

  const grouped = useMemo(() => {
    const categories: Record<string, Tag[]> = {};
    const remaining: Tag[] = [];
    for (const tag of tags) {
      if (tag.data.value) {
        if (!categories[tag.data.key]) categories[tag.data.key] = [];
        categories[tag.data.key].push(tag);
      } else remaining.push(tag);
    }
    return {
      categories: Object.entries(categories).sort((a, b) => (a[0] > b[0] ? 1 : -1)),
      remaining,
    };
  }, [tags]);

  return (
    <div style={{ maxWidth: 1100, margin: '32px auto' }}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiSideNav
            style={{ width: 192 }}
            items={grouped.categories.map(([name, tagsList]) => ({
              name,
              id: name,
              items: tagsList.map((tag) => ({
                name: tag.data.title,
                id: tag.id,
                renderItem: () => (
                  <div style={{ padding: '4px 0' }}>
                    <TagUi id={tag.id} />
                  </div>
                ),
              })),
            }))}
          />
          <EuiHorizontalRule />
          <div style={{ marginTop: -8 }}>
            <EuiSideNav
              style={{ width: 192 }}
              items={[
                {
                  name: '',
                  id: 'remainingTags',
                  items: grouped.remaining.map((tag) => ({
                    name: tag.data.title,
                    id: tag.id,
                    renderItem: () => (
                      <div style={{ padding: '4px 0' }}>
                        <TagUi id={tag.id} />
                      </div>
                    ),
                  })),
                },
              ]}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="l" hasShadow>
            <TagPicker fullWidth selected={selected} onChange={setSelected} />
            <ResultsList tagIds={selected} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
