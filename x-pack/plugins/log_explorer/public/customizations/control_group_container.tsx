/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiStyled } from '@kbn/kibana-react-plugin/common';

export const ControlGroupContainer = euiStyled.div`
[class*='options_list_popover_footer--OptionsListPopoverFooter'] {
  display: none;
}

[data-test-subj='optionsListControl__sortingOptionsButton'] {
  display: none;
}

[id^='control-popover'] .euiPopoverTitle {
  display: none;
}

  .euiFlexGroup.controlGroup {
    min-height: 34px;
  }

  .euiFormControlLayout.euiFormControlLayout--group.controlFrame__formControlLayout {
    height: 34px;

    & .euiFormLabel.controlFrame__formControlLayoutLabel {
      padding: 8px !important;
    }

    .euiButtonEmpty.euiFilterButton {
      height: 32px;
    }
  }

  .euiText.errorEmbeddableCompact__button {
    padding: 8px;

    .euiLink {
      display: flex;
      gap: 8px;
    }
  }
`;
