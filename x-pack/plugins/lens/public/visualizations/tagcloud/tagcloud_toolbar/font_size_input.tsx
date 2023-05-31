/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { debounce } from 'lodash';
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

  // Storing propagateOnChange in ref 
  // so there is one instance per component 
  // instead of one instance per execution cycle.
  const propagateOnChangeRef = useRef({
      onChange: debounce((minFontSize: number, maxFontSize: number) => {
        props.onChange(minFontSize, maxFontSize);
      }, 150),
  });

  useEffect(() => {
    return () => {
      propagateOnChangeRef.current.onChange.cancel();
    };
  }, []);

  return (
    <EuiDualRange
      id="tagCloudFontSizeSlider"
      min={5}
      max={120}
      step={1}
      value={fontSize}
      onChange={(value) => {
        setFontSize(value as [number, number]);
        propagateOnChangeRef.current.onChange(value[0] as number, value[1] as number);
      }}
      aria-label={i18n.translate('xpack.lens.label.tagcloud.fontSizeLabel', {
        defaultMessage: 'Font size',
      })}
    />
  );
}
