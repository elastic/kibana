/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';

import { AndOrBadge } from '..';

const sampleText =
  'Doggo ipsum i am bekom fat snoot wow such tempt waggy wags floofs, ruff heckin good boys and girls mlem.  Ruff heckin good boys and girls mlem stop it fren borkf borking doggo very hand that feed shibe, you are doing me the shock big ol heck smol borking doggo with a long snoot for pats heckin good boys. You are doing me the shock smol borking doggo with a long snoot for pats wow very biscit, length boy. Doggo ipsum i am bekom fat snoot wow such tempt waggy wags floofs, ruff heckin good boys and girls mlem.  Ruff heckin good boys and girls mlem stop it fren borkf borking doggo very hand that feed shibe, you are doing me the shock big ol heck smol borking doggo with a long snoot for pats heckin good boys.';

storiesOf('components/AndOrBadge', module)
  .add('and', () => (
    <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: true })}>
      <AndOrBadge type="and" />
    </ThemeProvider>
  ))
  .add('or', () => (
    <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: true })}>
      <AndOrBadge type="or" />
    </ThemeProvider>
  ))
  .add('antennas', () => (
    <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: true })}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <AndOrBadge type="and" includeAntennas />
        </EuiFlexItem>
        <EuiFlexItem>
          <p>{sampleText}</p>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ThemeProvider>
  ));
