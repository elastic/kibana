/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { render } from '../../../utils/test_helper';
import { alertWithGroupsAndTags } from '../mock/alert';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { StatusBar } from './status_bar';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../../utils/kibana_react');
jest.mock('@kbn/alerts-ui-shared');

const useKibanaMock = useKibana as jest.Mock;
const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract().services,
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
    },
  });
};

describe('Source bar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('should show alert data', async () => {
    const statusBar = render(<StatusBar alert={alertWithGroupsAndTags} />);

    expect(
      statusBar.queryByText(alertWithGroupsAndTags.fields[ALERT_RULE_NAME])
    ).toBeInTheDocument();
  });
});
