import React from 'react';
export declare enum MobileErrorTabIds {
    ERRORS = "errors",
    CRASHES = "crashes"
}
export declare function Tabs({ mobileErrorTabId, onTabClick, }: {
    mobileErrorTabId: MobileErrorTabIds;
    onTabClick: (nextTab: MobileErrorTabIds) => void;
}): React.JSX.Element;
