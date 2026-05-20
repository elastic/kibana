import React from 'react';
import * as t from 'io-ts';
import { IndexLifecyclePhaseSelectOption } from '../../../../common/storage_explorer_types';
export declare const storageExplorer: {
    '/storage-explorer': {
        element: React.JSX.Element;
        params: t.TypeC<{
            query: t.TypeC<{
                indexLifecyclePhase: t.UnionC<[t.LiteralC<IndexLifecyclePhaseSelectOption.All>, t.LiteralC<IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<IndexLifecyclePhaseSelectOption.Frozen>]>;
            }>;
        }>;
        defaults: {
            query: {
                indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
            };
        };
    };
};
