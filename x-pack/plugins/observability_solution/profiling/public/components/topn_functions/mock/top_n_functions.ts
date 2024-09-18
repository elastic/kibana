/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TopNFunctions } from '@kbn/profiling-utils';

export const data = {
  TotalCount: 4,
  TopN: [
    {
      Rank: 1,
      Frame: {
        FrameID: 'VZbhUAtQEfdUptXfb8HvNgAAAAAAsbAE',
        FileID: 'VZbhUAtQEfdUptXfb8HvNg',
        FrameType: 4,
        Inline: false,
        AddressOrLine: 11644932,
        FunctionName: '_raw_spin_unlock_irq',
        FunctionOffset: 0,
        SourceLine: 0,
        ExeFileName: 'vmlinux',
      },
      CountExclusive: 1535,
      CountInclusive: 1550,
      Id: 'full;vmlinux;_raw_spin_unlock_irq;',
    },
    {
      Rank: 2,
      Frame: {
        FrameID: 'VZbhUAtQEfdUptXfb8HvNgAAAAAAsRk2',
        FileID: 'VZbhUAtQEfdUptXfb8HvNg',
        FrameType: 4,
        Inline: false,
        AddressOrLine: 11606326,
        FunctionName: 'syscall_enter_from_user_mode',
        FunctionOffset: 0,
        SourceLine: 0,
        ExeFileName: 'vmlinux',
      },
      CountExclusive: 1320,
      CountInclusive: 1610,
      Id: 'full;vmlinux;syscall_enter_from_user_mode;',
    },
    {
      Rank: 3,
      Frame: {
        FrameID: 'VZbhUAtQEfdUptXfb8HvNgAAAAAAsa_W',
        FileID: 'VZbhUAtQEfdUptXfb8HvNg',
        FrameType: 4,
        Inline: false,
        AddressOrLine: 11644886,
        FunctionName: '_raw_spin_unlock_irqrestore',
        FunctionOffset: 0,
        SourceLine: 0,
        ExeFileName: 'vmlinux',
      },
      CountExclusive: 1215,
      CountInclusive: 1220,
      Id: 'full;vmlinux;_raw_spin_unlock_irqrestore;',
    },
    {
      Rank: 4,
      Frame: {
        FrameID: 'VZbhUAtQEfdUptXfb8HvNgAAAAAAF_dD',
        FileID: 'VZbhUAtQEfdUptXfb8HvNg',
        FrameType: 4,
        Inline: false,
        AddressOrLine: 1570627,
        FunctionName: 'audit_filter_syscall',
        FunctionOffset: 0,
        SourceLine: 0,
        ExeFileName: 'vmlinux',
      },
      CountExclusive: 920,
      CountInclusive: 1560,
      Id: 'full;vmlinux;audit_filter_syscall;',
    },
  ],
  SamplingRate: 0.2,
} as TopNFunctions;
