/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiDualRange } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  minFontSize: number;
  maxFontSize: number;
  onChange: (minFontSize: number, maxFontSize: number) => void;
}

export function FontSizeInput(props: Props) {
  const [fontSize, setFontSize] = useState<[number, number]>([
    props.minFontSize,
    props.maxFontSize,
  ]);

  const [, cancel] = useDebounce(
    () => {
      props.onChange(fontSize[0], fontSize[1]);
    },
    150,
    [fontSize]
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return (
    <EuiDualRange
      id="tagCloudFontSizeSlider"
      min={1}
      max={120}
      step={1}
      value={fontSize}
      onChange={(value) => {
        setFontSize(value as [number, number]);
      }}
      showLabels
      compressed
      aria-label={i18n.translate('xpack.lens.label.tagcloud.fontSizeLabel', {
        defaultMessage: 'Font size',
      })}
    />
  );
}
