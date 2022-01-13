/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const useChartTheme = () => {
  const { services } = useKibana();
  const kibanaTheme = useObservable(services!.theme!.theme$);
  const darkMode = kibanaTheme?.darkMode || false;

  const theme = useMemo(() => {
    return darkMode ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme;
  }, [darkMode]);

  return theme;
};
