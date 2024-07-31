/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

export const SYNTAX = '{{ field.name fieldValue1 fieldValue2 fieldValueN }}';
const GOOD_SYNTAX_EXAMPLES =
  'Examples of CORRECT syntax (includes field names and values): {{ host.name hostNameValue }} {{ user.name userNameValue }} {{ source.ip sourceIpValue }}';

const BAD_SYNTAX_EXAMPLES =
  'Examples of INCORRECT syntax (bad, because the field names are not included): {{ hostNameValue }} {{ userNameValue }} {{ sourceIpValue }}';

const RECONNAISSANCE = 'Reconnaissance';
const INITIAL_ACCESS = 'Initial Access';
const EXECUTION = 'Execution';
const PERSISTENCE = 'Persistence';
const PRIVILEGE_ESCALATION = 'Privilege Escalation';
const DISCOVERY = 'Discovery';
const LATERAL_MOVEMENT = 'Lateral Movement';
const COMMAND_AND_CONTROL = 'Command and Control';
const EXFILTRATION = 'Exfiltration';

const MITRE_ATTACK_TACTICS = [
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

// NOTE: we ask the LLM for `insight`s. We do NOT use the feature name, `AttackDiscovery`, in the prompt.
export const getOutputParser = () =>
  StructuredOutputParser.fromZodSchema(
    z
      .array(
        z.object({
          alertIds: z.string().array().describe(`The alert IDs that the insight is based on.`),
          detailsMarkdown: z
            .string()
            .describe(
              `A detailed insight with markdown, where each markdown bullet contains a description of what happened that reads like a story of the attack as it played out and always uses special ${SYNTAX} syntax for field names and values from the source data. ${GOOD_SYNTAX_EXAMPLES} ${BAD_SYNTAX_EXAMPLES}`
            ),
          entitySummaryMarkdown: z
            .string()
            .optional()
            .describe(
              `A short (no more than a sentence) summary of the insight featuring only the host.name and user.name fields (when they are applicable), using the same ${SYNTAX} syntax`
            ),
          mitreAttackTactics: z
            .string()
            .array()
            .optional()
            .describe(
              `An array of MITRE ATT&CK tactic for the insight, using one of the following values: ${MITRE_ATTACK_TACTICS.join(
                ','
              )}`
            ),
          summaryMarkdown: z
            .string()
            .describe(`A markdown summary of insight, using the same ${SYNTAX} syntax`),
          title: z
            .string()
            .describe(
              'A short, no more than 7 words, title for the insight, NOT formatted with special syntax or markdown. This must be as brief as possible.'
            ),
        })
      )
      .describe(
        `Insights with markdown that always uses special ${SYNTAX} syntax for field names and values from the source data. ${GOOD_SYNTAX_EXAMPLES} ${BAD_SYNTAX_EXAMPLES}`
      )
  );
