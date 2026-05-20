import type { MouseEvent } from 'react';
export interface Action {
    key: string;
    label: React.ReactNode;
    href?: string;
    onClick?: (event: MouseEvent) => void;
    condition: boolean;
}
interface Section {
    key: string;
    title?: string;
    subtitle?: string;
    actions: Action[];
}
export type SectionRecord = Record<string, Section[]>;
/** Filter out actions that shouldnt be shown and sections without any actions. */
export declare function getNonEmptySections(sectionRecord: SectionRecord): {
    actions: Action[];
    key: string;
    title?: string;
    subtitle?: string;
}[][];
export {};
