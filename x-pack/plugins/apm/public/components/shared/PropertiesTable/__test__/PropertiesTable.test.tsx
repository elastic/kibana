/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { PropertiesTable, TabHelpMessage } from '..';
import * as agentDocs from '../../../../utils/documentation/agents';

describe('PropertiesTable', () => {
  describe('PropertiesTable component', () => {
    it('should render with data', () => {
      expect(
        shallow(
          <PropertiesTable
            propData={{ a: 'hello', b: 'bananas' }}
            propKey="kubernetes"
            agentName="java"
          />
        )
      ).toMatchSnapshot();
    });

    it("should render empty when data isn't present", () => {
      expect(
        shallow(<PropertiesTable propKey="kubernetes" agentName="java" />)
      ).toMatchSnapshot();
    });

    it('should still render NestedKeyValueTable even when data has no keys', () => {
      expect(
        shallow(
          <PropertiesTable
            propData={{}}
            propKey="kubernetes"
            agentName="java"
          />
        )
      ).toMatchSnapshot();
    });
  });

  describe('TabHelpMessage component', () => {
    const tabKey = 'user';
    const agentName = 'nodejs';

    it('should render when docs are returned', () => {
      jest
        .spyOn(agentDocs, 'getAgentDocUrlForTab')
        .mockImplementation(() => 'mock-url');

      expect(
        shallow(<TabHelpMessage tabKey={tabKey} agentName={agentName} />)
      ).toMatchSnapshot();
      expect(agentDocs.getAgentDocUrlForTab).toHaveBeenCalledWith(
        tabKey,
        agentName
      );
    });

    it('should render null empty string when no docs are returned', () => {
      jest
        .spyOn(agentDocs, 'getAgentDocUrlForTab')
        .mockImplementation(() => undefined);

      expect(
        shallow(<TabHelpMessage tabKey={tabKey} agentName={agentName} />)
      ).toMatchSnapshot();
    });
  });
});
