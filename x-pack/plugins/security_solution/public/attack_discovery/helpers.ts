/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import * as i18n from './translations';

export const RECONNAISSANCE = 'Reconnaissance';
export const INITIAL_ACCESS = 'Initial Access';
export const EXECUTION = 'Execution';
export const PERSISTENCE = 'Persistence';
export const PRIVILEGE_ESCALATION = 'Privilege Escalation';
export const DISCOVERY = 'Discovery';
export const LATERAL_MOVEMENT = 'Lateral Movement';
export const COMMAND_AND_CONTROL = 'Command and Control';
export const EXFILTRATION = 'Exfiltration';

/** A subset of the Mitre Attack Tactics */
export const MITRE_ATTACK_TACTICS_SUBSET = [
  RECONNAISSANCE,
  INITIAL_ACCESS,
  EXECUTION,
  PERSISTENCE,
  PRIVILEGE_ESCALATION,
  DISCOVERY,
  LATERAL_MOVEMENT,
  COMMAND_AND_CONTROL,
  EXFILTRATION,
] as const;

export const getTacticLabel = (tactic: string): string => {
  switch (tactic) {
    case RECONNAISSANCE:
      return i18n.RECONNAISSANCE;
    case INITIAL_ACCESS:
      return i18n.INITIAL_ACCESS;
    case EXECUTION:
      return i18n.EXECUTION;
    case PERSISTENCE:
      return i18n.PERSISTENCE;
    case PRIVILEGE_ESCALATION:
      return i18n.PRIVILEGE_ESCALATION;
    case DISCOVERY:
      return i18n.DISCOVERY;
    case LATERAL_MOVEMENT:
      return i18n.LATERAL_MOVEMENT;
    case COMMAND_AND_CONTROL:
      return i18n.COMMAND_AND_CONTROL;
    case EXFILTRATION:
      return i18n.EXFILTRATION;
    default:
      return tactic;
  }
};

export interface TacticMetadata {
  detected: boolean;
  index: number;
  name: string;
}

export const getTacticMetadata = (attackDiscovery: AttackDiscovery): TacticMetadata[] =>
  MITRE_ATTACK_TACTICS_SUBSET.map((tactic, i) => ({
    detected:
      attackDiscovery.mitreAttackTactics === undefined
        ? false
        : attackDiscovery.mitreAttackTactics.includes(tactic),
    name: getTacticLabel(tactic),
    index: i,
  }));

/**
 * The LLM sometimes returns a string with newline literals.
 * This function replaces them with actual newlines
 */
export const replaceNewlineLiterals = (markdown: string): string => markdown.replace(/\\n/g, '\n');
