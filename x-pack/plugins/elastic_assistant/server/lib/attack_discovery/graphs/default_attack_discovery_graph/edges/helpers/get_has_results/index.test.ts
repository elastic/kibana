/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscovery } from '@kbn/elastic-assistant-common';

import { getHasResults } from '.';

const attackDiscoveries: AttackDiscovery[] = [
  {
    title: 'Critical Malware and Phishing Alerts on host e1cb3cf0-30f3-4f99-a9c8-518b955c6f90',
    alertIds: [
      '4af5689eb58c2420efc0f7fad53c5bf9b8b6797e516d6ea87d6044ce25d54e16',
      'c675d7eb6ee181d788b474117bae8d3ed4bdc2168605c330a93dd342534fb02b',
      '021b27d6bee0650a843be1d511119a3b5c7c8fdaeff922471ce0248ad27bd26c',
      '6cc8d5f0e1c2b6c75219b001858f1be64194a97334be7a1e3572f8cfe6bae608',
      'f39a4013ed9609584a8a22dca902e896aa5b24d2da03e0eaab5556608fa682ac',
      '909968e926e08a974c7df1613d98ebf1e2422afcb58e4e994beb47b063e85080',
      '2c25a4dc31cd1ec254c2b19ea663fd0b09a16e239caa1218b4598801fb330da6',
      '3bf907becb3a4f8e39a3b673e0d50fc954a7febef30c12891744c603760e4998',
    ],
    timestamp: '2024-10-10T22:59:52.749Z',
    detailsMarkdown:
      '- On `2023-06-19T00:28:38.061Z` a critical malware detection alert was triggered on host {{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }} running {{ host.os.name macOS }} version {{ host.os.version 13.4 }}.\n- The malware was identified as {{ file.name unix1 }} with SHA256 hash {{ file.hash.sha256 0b18d6880dc9670ab2b955914598c96fc3d0097dc40ea61157b8c79e75edf231 }}.\n- The process {{ process.name My Go Application.app }} was executed with command line {{ process.command_line /private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app }}.\n- The process was not trusted as its code signature failed to satisfy specified code requirements.\n- The user involved was {{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}.\n- Another critical alert was triggered for potential credentials phishing via {{ process.name osascript }} on the same host.\n- The phishing attempt involved displaying a dialog to capture the user\'s password.\n- The process {{ process.name osascript }} was executed with command line {{ process.command_line osascript -e display dialog "MacOS wants to access System Preferences\\n\\nPlease enter your password." with title "System Preferences" with icon file "System:Library:CoreServices:CoreTypes.bundle:Contents:Resources:ToolbarAdvanced.icns" default answer "" giving up after 30 with hidden answer ¬ }}.\n- The MITRE ATT&CK tactics involved include Credential Access and Input Capture.',
    summaryMarkdown:
      'Critical malware and phishing alerts detected on {{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }} involving user {{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}. Malware identified as {{ file.name unix1 }} and phishing attempt via {{ process.name osascript }}.',
    mitreAttackTactics: ['Credential Access', 'Input Capture'],
    entitySummaryMarkdown:
      'Critical malware and phishing alerts detected on {{ host.name e1cb3cf0-30f3-4f99-a9c8-518b955c6f90 }} involving user {{ user.name 039c15c5-3964-43e7-a891-42fe2ceeb9ff }}.',
  },
];

describe('getHasResults', () => {
  it('returns true when attackDiscoveries is not null', () => {
    expect(getHasResults(attackDiscoveries)).toBe(true);
  });

  it('returns false when attackDiscoveries is null', () => {
    expect(getHasResults(null)).toBe(false);
  });
});
