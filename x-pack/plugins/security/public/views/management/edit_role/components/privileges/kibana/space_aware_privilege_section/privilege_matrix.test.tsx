/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { EuiButtonEmpty, EuiInMemoryTable } from '@elastic/eui';
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { Space } from '../../../../../../../../../spaces/common/model/space';
import { Feature } from '../../../../../../../../../xpack_main/types';
import { KibanaPrivileges, Role } from '../../../../../../../../common/model';
import { KibanaPrivilegeCalculatorFactory } from '../../../../../../..//lib/kibana_privilege_calculator';
import { PrivilegeMatrix } from './privilege_matrix';

describe('PrivilegeMatrix', () => {
  it('can render a complex matrix', () => {
    const spaces: Space[] = ['*', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'].map(a => ({
      id: a,
      name: `${a} space`,
      disabledFeatures: [],
    }));

    const features: Feature[] = [
      {
        id: 'feature1',
        name: 'feature 1',
        icon: 'apmApp',
        app: [],
        privileges: {},
      },
      {
        id: 'feature2',
        name: 'feature 2',
        icon: 'apmApp',
        app: [],
        privileges: {},
      },
      {
        id: 'feature3',
        name: 'feature 3',
        icon: 'apmApp',
        app: [],
        privileges: {},
      },
    ];

    const role: Role = {
      name: 'role',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [
        {
          spaces: ['*'],
          base: ['read'],
          feature: {
            feature1: ['all'],
          },
        },
        {
          spaces: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
          base: [],
          feature: {
            feature2: ['read'],
            feature3: ['all'],
          },
        },
        {
          spaces: ['k'],
          base: ['all'],
          feature: {
            feature2: ['read'],
            feature3: ['read'],
          },
        },
      ],
    };

    const calculator = new KibanaPrivilegeCalculatorFactory(
      new KibanaPrivileges({
        global: {
          all: [],
          read: [],
        },
        features: {
          feature1: {
            all: [],
            read: [],
          },
          feature2: {
            all: [],
            read: [],
          },
          feature3: {
            all: [],
            read: [],
          },
        },
        space: {
          all: [],
          read: [],
        },
        reserved: {},
      })
    ).getInstance(role);

    const wrapper = mountWithIntl(
      <PrivilegeMatrix
        role={role}
        spaces={spaces}
        features={features}
        calculatedPrivileges={calculator.calculateEffectivePrivileges()}
        intl={null as any}
      />
    );

    wrapper.find(EuiButtonEmpty).simulate('click');
    wrapper.update();

    const { columns, items } = wrapper.find(EuiInMemoryTable).props() as any;

    expect(columns).toHaveLength(4); // all spaces groups plus the "feature" column
    expect(items).toHaveLength(features.length + 1); // all features plus the "base" row
  });
});
