/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';
import useMountedState from 'react-use/lib/useMountedState';
import { useTagsApp } from '../../../../context';
import { Empty } from './empty';

export interface Props {
  tagIds: string[];
}

export const ResultsList: React.FC<Props> = ({ tagIds }) => {
  const { tags, kid } = useTagsApp();
  const isMounted = useMountedState();
  const [kids, setKids] = useState<string[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    tags
      .attachments!.findResources({
        tagIds,
        kidPrefix: 'kid:',
        page: 1,
        perPage: 100,
      })
      .then(
        (response) => {
          if (!isMounted()) return;
          setKids(response.attachments.map((item) => item.kid));
        },
        (newError) => {
          if (!isMounted()) return;
          setError(newError);
        }
      );
  }, [isMounted, tags.attachments, tagIds]);

  const grouped = useMemo<{
    dashboards: string[];
    visualizations: string[];
    other: string[];
  }>(() => {
    const dashboards: string[] = [];
    const visualizations: string[] = [];
    const other: string[] = [];
    if (!kids || !kids.length) return { dashboards, visualizations, other };
    for (const item of kids) {
      if (item.indexOf('kid:::so:saved_objects/dashboard/') > -1) dashboards.push(item);
      else if (item.indexOf('kid:::so:saved_objects/visualization/') > -1)
        visualizations.push(item);
      else other.push(item);
    }
    return { dashboards, visualizations, other };
  }, [kids]);

  if (error || !kids) return null;

  return (
    <>
      {!!kids.length ? (
        <>
          {!!grouped.dashboards.length && (
            <>
              <EuiFlexGroup gutterSize="l">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h6>Dashboards</h6>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup gutterSize="l">
                {grouped.dashboards.map((resuldKid) => (
                  <EuiFlexItem key={resuldKid} style={{ maxWidth: 200 }}>
                    <kid.Card kid={resuldKid} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
              <EuiSpacer />
            </>
          )}
          {!!grouped.visualizations.length && (
            <>
              <EuiFlexGroup gutterSize="l">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h6>Visualizations</h6>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup gutterSize="l">
                {grouped.visualizations.map((resuldKid) => (
                  <EuiFlexItem key={resuldKid} style={{ maxWidth: 200 }}>
                    <kid.Card kid={resuldKid} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
              <EuiSpacer />
            </>
          )}
          {!!grouped.other.length &&
            grouped.other.map((resuldKid) => (
              <EuiFlexGroup gutterSize="l">
                <EuiTitle size="s">
                  <h6>Other</h6>
                </EuiTitle>
                <EuiSpacer />
                <EuiFlexItem key={resuldKid} style={{ maxWidth: 200 }}>
                  <kid.Card kid={resuldKid} />
                </EuiFlexItem>
              </EuiFlexGroup>
            ))}
        </>
      ) : (
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem>
            <Empty />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};
