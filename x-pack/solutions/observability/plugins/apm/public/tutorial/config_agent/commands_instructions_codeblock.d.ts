import React from 'react';
import type { LineNumbers } from './commands/get_apm_agent_commands';
export declare function CommandsInstructionsCodeblock({ variantId, lineNumbers, highlightLang, commands, commandsWithSecrets, }: {
    variantId: string;
    lineNumbers: LineNumbers;
    highlightLang: string;
    commands: string;
    commandsWithSecrets: string;
}): React.JSX.Element;
