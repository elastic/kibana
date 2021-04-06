/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { NoServicesMessage } from './no_services_message';

function Wrapper({ children }: { children?: ReactNode }) {
  return <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>;
}

describe('NoServicesMessage', () => {
  Object.values(FETCH_STATUS).forEach((status) => {
    [true, false].forEach((historicalDataFound) => {
      describe(`when status is ${status}`, () => {
        describe(`when historicalDataFound is ${historicalDataFound}`, () => {
          it('renders', () => {
            expect(() =>
              render(
                <NoServicesMessage
                  status={status}
                  historicalDataFound={historicalDataFound}
                />,
                { wrapper: Wrapper }
              )
            ).not.toThrowError();
          });
        });
      });
    });
  });
});
