/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SetupModeBadge } from './badge';
import {
  ELASTICSEARCH_SYSTEM_ID,
  KIBANA_SYSTEM_ID,
  BEATS_SYSTEM_ID,
  APM_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
} from '../../../common/constants';

const STATUSES = [
  {
    name: 'internal collection',
    status: {
      isInternalCollector: true,
    },
  },
  {
    name: 'partially migrated',
    status: {
      isPartiallyMigrated: true,
    },
  },
  {
    name: 'metricbeat collection',
    status: {
      isFullyMigrated: true,
    },
  },
  {
    name: 'net new user',
    status: {
      isNetNewUser: true,
    },
  },
  {
    name: 'unknown',
    status: {},
  },
];

const PRODUCTS = [
  {
    name: ELASTICSEARCH_SYSTEM_ID,
  },
  {
    name: KIBANA_SYSTEM_ID,
  },
  {
    name: LOGSTASH_SYSTEM_ID,
  },
  {
    name: BEATS_SYSTEM_ID,
  },
  {
    name: APM_SYSTEM_ID,
  },
];

describe('setupMode SetupModeBadge', () => {
  for (const status of STATUSES) {
    describe(`${status.name}`, () => {
      it('should render each product consistently', () => {
        let template = null;
        for (const { name } of PRODUCTS) {
          const component = shallow(
            <SetupModeBadge
              setupMode={{
                data: {},
                meta: {},
              }}
              status={status.status}
              productName={name}
              instance={null}
            />
          );
          if (!template) {
            template = component;
            expect(component).toMatchSnapshot();
          } else {
            expect(template.debug()).toEqual(component.debug());
          }
        }
      });
    });
  }

  it('should call openFlyout when clicked', () => {
    const openFlyout = jest.fn();
    const instance = {
      id: 1,
    };
    const component = shallow(
      <SetupModeBadge
        setupMode={{
          openFlyout,
          data: {},
          meta: {},
        }}
        status={{
          isPartiallyMigrated: true,
        }}
        productName={ELASTICSEARCH_SYSTEM_ID}
        instance={instance}
      />
    );

    component.find('EuiBadge').simulate('click');
    expect(openFlyout).toHaveBeenCalledWith(instance);
  });

  it('should use a custom action for the live elasticsearch cluster', () => {
    const shortcutToFinishMigration = jest.fn();
    const component = shallow(
      <SetupModeBadge
        setupMode={{
          shortcutToFinishMigration,
          data: {
            totalUniquePartiallyMigratedCount: 1,
            totalUniqueInstanceCount: 1,
          },
          meta: {
            liveClusterUuid: 1,
          },
        }}
        clusterUuid={1}
        status={{
          isPartiallyMigrated: true,
        }}
        productName={ELASTICSEARCH_SYSTEM_ID}
        instance={null}
      />
    );
    component.find('EuiBadge').simulate('click');
    expect(shortcutToFinishMigration).toHaveBeenCalled();
  });

  it('should use a text status if internal collection cannot be disabled yet for elasticsearch', () => {
    const component = shallow(
      <SetupModeBadge
        setupMode={{
          data: {
            totalUniquePartiallyMigratedCount: 1,
            totalUniqueInstanceCount: 2,
          },
          meta: {
            liveClusterUuid: 1,
          },
        }}
        clusterUuid={1}
        status={{
          isPartiallyMigrated: true,
        }}
        productName={ELASTICSEARCH_SYSTEM_ID}
        instance={null}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
