# Security Solution expandable flyouts

For more info on the expandable flyout, see the `@kbn/expandable-flyout` package.

## Description

The Security Solution plugin aims at having a single instance of the expandable flyout. That instance can display as many panels as we need. This folder hosts all the panels that are can be displayed in the Security Solution flyout. Panels can be differentiated as to be displayed in different sections of the expandable flyout (right, left or preview), but ultimately, nothing prevents us from displaying a panel in any section we want.

> Remember to add any new panels to the `index.tsx` at the root of the [flyout folder](https://github.com/elastic/kibana/tree/main/x-pack/plugins/security_solution/public/flyout). These are passed to the `@kbn/expandable-flyout` package as `registeredPanels`. Failing to do so will result in the panel not being rendered.

## Notes

The structure of the `flyout` folder is intended to work as follows:
- multiple top level folders referring to the _type_ of flyout (for example document details, user, host, rule, cases...) and would contain all the panels for that flyout _type_. Each of these top level folders can be organized the way you want, but we recommend following a similar structure to the one we have for the `document_details` flyout type, where the `right`, `left` and `preview` folders correspond to the panels displayed in the right, left and preview flyout sections respectively. The `shared` folder contains any shared components/hooks/services/helpers that are used within the other folders.
```
document_details
└─── right
└─── left
└─── preview
└─── shared
```
- one top level `shared` folder containing all the components/hooks/services/helpers that are used across multiple flyout types. Putting code in this folder should be very deliberate, and should follow some guidelines:
  - code built in isolation (meaning that it should not be built with a specific flyout type or usage in mind)
  - extensively tested
  - components should have storybook stories

The `flyout` folder structure should therefore look like this:
```
flyout
│   index.tsx
│   jest.config.js
│   README.md    
│
└─── document_details
│   └─── right
│   └─── left
│   └─── preview
│
└─── new_type
│   └─── right
│   └─── preview
│
└─── other_new_type
│   └─── right
│   └─── left
│
└─── ...
│
└─── shared
    └─── components
```
