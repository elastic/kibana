/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import {
  AgentFeatureTipMessage,
  getPropertyTabNames,
  PropertiesTable,
  sortKeysByConfig
} from '..';
import * as agentDocs from '../../../../utils/documentation/agents';
import * as propertyConfig from '../propertyConfig';

describe('PropertiesTable', () => {
  beforeEach(() => {
    mockPropertyConfig();
  });

  afterEach(() => {
    unMockPropertyConfig();
  });

  describe('PropertiesTable component', () => {
    it('should render with data', () => {
      expect(
        shallow(
          <PropertiesTable
            propData={{ a: 'hello', b: 'bananas' }}
            propKey="testPropKey"
            agentName="testAgentName"
          />
        )
      ).toMatchSnapshot();
    });

    it("should render empty when data isn't present", () => {
      expect(
        shallow(
          <PropertiesTable propKey="testPropKey" agentName="testAgentName" />
        )
      ).toMatchSnapshot();
    });

    it('should still render NestedKeyValueTable even when data has no keys', () => {
      expect(
        shallow(
          <PropertiesTable
            propData={{}}
            propKey="testPropKey"
            agentName="testAgentName"
          />
        )
      ).toMatchSnapshot();
    });
  });

  describe('sortKeysByConfig', () => {
    const testData = {
      color: 'blue',
      name: 'Jess',
      age: '39',
      numbers: [1, 2, 3],
      _id: '44x099z'
    };

    it('should sort with presorted keys first', () => {
      expect(sortKeysByConfig(testData, 'testProperty')).toEqual([
        'name',
        'age',
        '_id',
        'color',
        'numbers'
      ]);
    });

    it('should alpha-sort keys when there is no config value found', () => {
      expect(sortKeysByConfig(testData, 'nonExistentKey')).toEqual([
        '_id',
        'age',
        'color',
        'name',
        'numbers'
      ]);
    });
  });

  describe('getPropertyTabNames', () => {
    it('should return selected and required keys only', () => {
      const expectedTabsConfig = [
        {
          key: 'testProperty',
          label: 'testPropertyLabel'
        },
        {
          key: 'requiredProperty',
          label: 'requiredPropertyLabel'
        }
      ];
      expect(getPropertyTabNames({ testProperty: {} } as any)).toEqual(
        expectedTabsConfig
      );
    });
  });

  describe('AgentFeatureTipMessage component', () => {
    const featureName = 'user';
    const agentName = 'nodejs';

    it('should render when docs are returned', () => {
      jest
        .spyOn(agentDocs, 'getAgentFeatureDocsUrl')
        .mockImplementation(() => 'mock-url');

      expect(
        shallow(
          <AgentFeatureTipMessage
            featureName={featureName}
            agentName={agentName}
          />
        )
      ).toMatchSnapshot();
      expect(agentDocs.getAgentFeatureDocsUrl).toHaveBeenCalledWith(
        featureName,
        agentName
      );
    });

    it('should render null empty string when no docs are returned', () => {
      jest
        .spyOn(agentDocs, 'getAgentFeatureDocsUrl')
        .mockImplementation(() => null);

      expect(
        shallow(
          <AgentFeatureTipMessage
            featureName={featureName}
            agentName={agentName}
          />
        )
      ).toMatchSnapshot();
    });
  });
});

function mockPropertyConfig() {
  // @ts-ignore
  propertyConfig.PROPERTY_CONFIG = [
    {
      key: 'testProperty',
      label: 'testPropertyLabel',
      required: false,
      presortedKeys: ['name', 'age']
    },
    {
      key: 'optionalProperty',
      label: 'optionalPropertyLabel',
      required: false
    },
    {
      key: 'requiredProperty',
      label: 'requiredPropertyLabel',
      required: true
    }
  ];
}

const originalPropertyConfig = propertyConfig.PROPERTY_CONFIG;
function unMockPropertyConfig() {
  // @ts-ignore
  propertyConfig.PROPERTY_CONFIG = originalPropertyConfig;
}
