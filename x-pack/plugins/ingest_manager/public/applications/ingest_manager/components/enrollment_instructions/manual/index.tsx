/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText, EuiSpacer } from '@elastic/eui';
import React from 'react';

export const ManualInstructions: React.FunctionComponent = () => {
  return (
    <>
      <EuiText>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam vestibulum ullamcorper
        turpis vitae interdum. Maecenas orci magna, auctor volutpat pellentesque eu, consectetur id
        est. Nunc orci lacus, condimentum vel congue ac, fringilla eget tortor. Aliquam blandit,
        nisi et congue euismod, leo lectus blandit risus, eu blandit erat metus sit amet leo. Nam
        dictum lobortis condimentum.
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText>
        Vivamus sem sapien, dictum eu tellus vel, rutrum aliquam purus. Cras quis cursus nibh.
        Aliquam fermentum ipsum nec turpis luctus lobortis. Nulla facilisi. Etiam nec fringilla
        urna, sed vehicula ipsum. Quisque vel pellentesque lorem, at egestas enim. Nunc semper elit
        lectus, in sollicitudin erat fermentum in. Pellentesque tempus massa eget purus pharetra
        blandit.
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText>
        Mauris congue enim nulla, nec semper est posuere non. Donec et eros eu nisi gravida
        malesuada eget in velit. Morbi placerat semper euismod. Suspendisse potenti. Morbi quis
        porta erat, quis cursus nulla. Aenean mauris lorem, mollis in mattis et, lobortis a lectus.
      </EuiText>
    </>
  );
};
