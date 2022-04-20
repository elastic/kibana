/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { getRuleTagsBadgeLazy } from '../../../common/get_rule_tags_badge';

const tags = [
  'tag1',
  'tag2',
  'tag3',
  'tag4',
];

export const RuleTagsBadgeSandbox = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div style={{ flex: 1 }}>
      {getRuleTagsBadgeLazy({
        isOpen,
        tags,
        onClick: () => setIsOpen(true),
        onClose: () => setIsOpen(false),
      })}
    </div>
  );
};
