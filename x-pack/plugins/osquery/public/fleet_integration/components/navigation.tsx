/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { snakeCase } from 'lodash/fp';
import { EuiIcon, EuiSideNav } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import qs from 'query-string';

export const Navigation = () => {
  const { push } = useHistory();
  const location = useLocation();

  const selectedItemName = useMemo(() => qs.parse(location.search)?.tab, [location.search]);

  const handleTabClick = useCallback(
    (tab) => {
      push({
        search: qs.stringify({ tab }),
      });
    },
    [push]
  );

  const createItem = useCallback(
    (name, data = {}) => ({
      ...data,
      id: snakeCase(name),
      name,
      isSelected: selectedItemName === name,
      onClick: () => handleTabClick(snakeCase(name)),
    }),
    [handleTabClick, selectedItemName]
  );

  const sideNav = useMemo(
    () => [
      createItem('Packs', {
        forceOpen: true,
        items: [
          createItem('List', {
            icon: <EuiIcon type="list" />,
          }),
          createItem('New pack', {
            icon: <EuiIcon type="listAdd" />,
          }),
        ],
      }),
      createItem('Saved Queries', {
        forceOpen: true,
        items: [
          createItem('List', {
            icon: <EuiIcon type="list" />,
          }),
          createItem('New query', {
            icon: <EuiIcon type="listAdd" />,
          }),
        ],
      }),
      // createItem('Scheduled Queries', {
      //   forceOpen: true,
      //   items: [
      //     createItem('List', {
      //       icon: <EuiIcon type="list" />,
      //     }),
      //     createItem('Schedule new query', {
      //       icon: <EuiIcon type="listAdd" />,
      //     }),
      //   ],
      // }),
      createItem('Live Query', {
        forceOpen: true,
        items: [
          createItem('Run', {
            icon: <EuiIcon type="play" />,
          }),
          createItem('History', {
            icon: <EuiIcon type="tableDensityNormal" />,
          }),
        ],
      }),
    ],
    [createItem]
  );

  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  return <EuiSideNav items={sideNav} style={{ width: 200 }} />;
};
