/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MitreAttack } from './mitre_attack';
import { RightPanelContext } from '../context';
import { MITRE_ATTACK_DETAILS_TEST_ID, MITRE_ATTACK_TITLE_TEST_ID } from './test_ids';

describe('<MitreAttack />', () => {
  it('should render mitre attack information', () => {
    const contextValue = {
      searchHit: {
        fields: {
          'kibana.alert.rule.parameters': [
            {
              threat: [
                {
                  framework: 'MITRE ATT&CK',
                  tactic: {
                    id: '123',
                    reference: 'https://attack.mitre.org/tactics/123',
                    name: 'Tactic',
                  },
                  technique: [
                    {
                      id: '456',
                      reference: 'https://attack.mitre.org/techniques/456',
                      name: 'Technique',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    } as unknown as RightPanelContext;

    const { getByTestId } = render(
      <RightPanelContext.Provider value={contextValue}>
        <MitreAttack />
      </RightPanelContext.Provider>
    );

    expect(getByTestId(MITRE_ATTACK_TITLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(MITRE_ATTACK_DETAILS_TEST_ID)).toBeInTheDocument();
  });

  it('should render empty component if missing mitre attack value', () => {
    const contextValue = {
      searchHit: {
        some_field: 'some_value',
      },
    } as unknown as RightPanelContext;

    const { baseElement } = render(
      <RightPanelContext.Provider value={contextValue}>
        <MitreAttack />
      </RightPanelContext.Provider>
    );

    expect(baseElement).toMatchInlineSnapshot(`
      <body>
        <div />
      </body>
    `);
  });
});
