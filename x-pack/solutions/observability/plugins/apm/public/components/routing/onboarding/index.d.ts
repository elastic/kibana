import type * as t from 'io-ts';
import React from 'react';
import type { INSTRUCTION_VARIANT } from '../../app/onboarding/instruction_variants';
export declare const onboarding: {
    '/onboarding': {
        element: React.JSX.Element;
        params: t.PartialC<{
            query: t.PartialC<{
                agent: t.UnionC<[t.LiteralC<INSTRUCTION_VARIANT.NODE>, t.LiteralC<INSTRUCTION_VARIANT.DJANGO>, t.LiteralC<INSTRUCTION_VARIANT.FLASK>, t.LiteralC<INSTRUCTION_VARIANT.RAILS>, t.LiteralC<INSTRUCTION_VARIANT.RACK>, t.LiteralC<INSTRUCTION_VARIANT.GO>, t.LiteralC<INSTRUCTION_VARIANT.JAVA>, t.LiteralC<INSTRUCTION_VARIANT.DOTNET>, t.LiteralC<INSTRUCTION_VARIANT.PHP>]>;
            }>;
        }>;
    };
};
