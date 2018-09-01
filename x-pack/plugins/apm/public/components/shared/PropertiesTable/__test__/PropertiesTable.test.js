/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import {
  PropertiesTable,
  AgentFeatureTipMessage,
  sortKeysByConfig,
  getPropertyTabNames
} from '..';
import { getFeatureDocs } from '../../../../utils/documentation';

jest.mock('../../../../utils/documentation');
jest.mock('../propertyConfig.json', () => [
  {
    key: 'testProperty',
    required: false,
    presortedKeys: ['name', 'age']
  },
  {
    key: 'optionalProperty',
    required: false
  },
  {
    key: 'requiredProperty',
    required: true
  }
]);

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

  it('should render empty when data has no keys', () => {
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
    expect(getPropertyTabNames(['testProperty'])).toEqual([
      'testProperty',
      'requiredProperty'
    ]);
  });
});

describe('AgentFeatureTipMessage component', () => {
  let mockDocs;
  const featureName = '';
  const agentName = '';

  beforeEach(() => {
    mockDocs = {
      text: 'Mock Docs Text',
      url: 'mock-url'
    };
    getFeatureDocs.mockImplementation(() => mockDocs);
  });

  it('should render when docs are returned', () => {
    expect(
      shallow(
        <AgentFeatureTipMessage
          featureName={featureName}
          agentName={agentName}
        />
      )
    ).toMatchSnapshot();
    expect(getFeatureDocs).toHaveBeenCalledWith(featureName, agentName);
  });

  it('should render when docs are returned, but missing a url', () => {
    delete mockDocs.url;
    expect(
      shallow(
        <AgentFeatureTipMessage
          featureName={featureName}
          agentName={agentName}
        />
      )
    ).toMatchSnapshot();
  });

  it('should render null empty string when no docs are returned', () => {
    mockDocs = null;
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
