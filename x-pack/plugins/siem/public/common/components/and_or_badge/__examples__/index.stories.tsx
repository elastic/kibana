/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { storiesOf } from '@storybook/react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { AndOrBadge } from '..';

const theme = () => ({ eui: euiLightVars, darkMode: false });

const sampleText =
  'Doggo ipsum what a nice floof vvv shibe many pats you are doin me a concern, puggorino super chub. Very good spot many pats he made many woofs many pats puggorino ruff, shooberino ruff boof. Mlem very good spot heckin angery woofer blep you are doing me the shock doge, heck stop it fren very taste wow. pupperino borkdrive. extremely cuuuuuute big ol pupper.';

storiesOf('components/AndOrBadge', module)
  .add('and', () => <AndOrBadge type="and" />)
  .add('or', () => <AndOrBadge type="or" />)
  .add('and - with antennas', () => (
    <ThemeProvider theme={theme}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <AndOrBadge type="and" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <p>{sampleText}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ThemeProvider>
  ))
  .add('or - with antennas', () => (
    <ThemeProvider theme={theme}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <AndOrBadge type="or" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <p>{sampleText}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ThemeProvider>
  ));
