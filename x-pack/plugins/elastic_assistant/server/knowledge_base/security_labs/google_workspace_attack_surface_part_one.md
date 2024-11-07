---
title: "Google Workspace Attack Surface"
slug: "google-workspace-attack-surface-part-one"
date: "2023-01-03"
subtitle: "Part One: Surveying the Land"
description: "During this multipart series, we’ll help you understand what GW is and some of the common risks to be aware of, while encouraging you to take control of your enterprise resources."
author:
  - slug: terrance-dejesus
image: "photo-edited-01-e.jpg"
category:
tags:
  - threat detection
  - cloud security
  - google workspace
  - google cloud
---

# Preamble

Formerly known as GSuite, Google Workspace (GW) is a collection of enterprise tools offered by Google. Popular services such as Google Drive, Gmail and Google Forms are used by many small and midsize businesses (SMBs), as well as larger organizations.

When referring to security, GW is often mentioned because a threat is abusing or targeting services and resources. As practitioners, it is essential we consider risks associated and plan defenses accordingly. Importantly, Microsoft and Amazon offer some of the same services: if there’s a “least risk” option among them we haven’t seen evidence of it yet, and each prioritizes their own form of visibility.

During this multipart series, we’ll help you understand what GW is and some of the common risks to be aware of, while encouraging you to take control of your enterprise resources: - Part One - Surveying the Land - Part Two - Setup Threat Detection with Elastic - Part Three - Detecting Common Threats

In this publication, readers will learn more about common resources and services in GW and how these are targeted by threats. This will provide an overview of administration, organizational structures, identity access and management (IAM), developer resources, and a few other topics you should think about.

But before we begin, let’s highlight the importance of organizations also taking ownership of this attack surface. If you’re using these enterprise tools and don’t consider them part of your enterprise, that is the challenge to overcome first. Know where your visibility extends to, know which capabilities you can exercise within that range, and don’t mistake vendor-operated for vendor-secured.

# Common Services Targeted by Threats

[Services and applications](https://workspace.google.com/features/) available in GW include cloud storage, email, identity and access management (IAM), chat and much more. Behind the scenes, [developers](https://developers.google.com/workspace) can access application programming interfaces (APIs) to interact programmatically with GW. Together, these services allow organizations of all sizes to provide users with their own Internet-accessible virtual “workspace”. However, threat actors have discovered trivial and advanced methods to abuse these services. While there is plenty of information to cover, we should start with administration as it provides an overview of GW and will help set the stage for more in-depth context about applications or developer resources.

## Administration

Few GW users are aware of the admin console or the settings it exposes, unless they happen to also be an administrator. The admin console is the central command center for GW administrators to manage the services and resources of their organization. The term “organization” is directly referenced by the primary domain registered with GW and therefore is the root node of GW. Only user accounts with administrative roles can sign-in and access their organization’s admin console.

![Snippet of GW home page](/assets/images/google-workspace-attack-surface-part-one/image1.jpg)

GW employs a directory service-like structure that defines users, groups, organizational units (OUs), roles and other attributes of the enterprise for easy navigation. While the admin console is not inherently a risk, compromised valid accounts ([T1078.004](https://attack.mitre.org/techniques/T1078/004/)) with that level of privilege expose organizations to greater risk.

Aside from IAM, administrators use the admin console to manage applications available to their organization. The most popular of these being Gmail, Drive and Docs, Google Meet, Google Forms, Google Sheets and Calendar. Additional Google services can be added, though most are enabled by default when setting up your GW; such as Chrome Remote Desktop. Depending on the OU configuration, permissions for users to these applications may be inherited from the root OU. The principles of least privilege (PoLP) and application control are critical to reducing organizational risk within GW.

![Snippet of GW Applications and Inheritance](/assets/images/google-workspace-attack-surface-part-one/image6.png)

Administrators can also manage mobile and endpoint device enrollment, as well as network related settings from the admin console. Administrators can add devices by uploading a CSV containing the serial number, which can be assigned to a user. For corporate-owned devices, this provides convenient auditing that may unfortunately become necessary. Universal settings for mobile devices are also available, allowing data and setting synchronization for iOS, Android and Google devices. GW allows mobile device management (MDM), allowing admins to apply local changes using [Open Mobile Alliance - Uniform Resources](https://learn.microsoft.com/en-us/troubleshoot/mem/intune/deploy-oma-uris-to-target-csp-via-intune) (OMA-URIs).

Coincidentally, making changes to remote enterprise endpoints is also a popular goal of adversaries.

GW admins have the capability to create and manage Wi-Fi, Ethernet, VPN and Cellular networks. For cellular devices this is typically done via the Subscription Management Root-Discovery Service (SM-DP) which is used to connect eSIM devices to a mobile network. VPN and proxy settings can be configured as well with routing through Google’s DNS infrastructure by default or custom routing if chosen.

Windows endpoints can also be managed via GW, with the capability to modify settings and synchronize data with Active Directory (AD) or an existing LDAP server. This is accomplishable with GW’s [Google Cloud Directory Sync](https://support.google.com/a/answer/106368?hl=en) (GCDS). Settings can be applied to each endpoint, such as BitLocker, automatic updates or authentication via [Google Credential Provider for Windows](https://support.google.com/a/answer/9250996?hl=en) (GCPW). GCPW allows users to login to a Windows endpoint with their Google account for authentication. Users with sufficient privileges can make changes to remote enterprise endpoints by configuring a [custom policy](https://support.google.com/a/answer/10181140#zippy=%2Cwindows-device-management%2Ccustom-settings) through the configuration service provider (CSP). This is possible with the Windows 10 enterprise platform, which exposes endpoint configuration settings that allow GW, as a MDM service to read, set, modify or delete configuration settings. Microsoft has an [extensive list](https://learn.microsoft.com/en-us/windows/configuration/provisioning-packages/how-it-pros-can-use-configuration-service-providers#a-href-idbkmk-csp-docahow-do-you-use-the-csp-documentation) of CSP settings that are exposed for management via custom policies. While integration between platforms is important to daily operations, this service equips adversaries with the capability to expand their intrusion into the Windows ecosystem.

## Organizational Structure

The digital structure of an enterprise in GCP or GW is often hierarchical: where the registered domain is the top-level, parent, or root, and any nested organizations under this are used for the grouping and permission scoping.

An important subject to understand for GW are OUs, which can be thought of as “departments” within an organization and can have subsidiary OUs. The hierarchy starts with a top-level OU, typically from the primary domain registration and organization name where child units can be added as needed. Service and application access are then inherited from the top-level OU if not specified. Users assigned to an OU will have access to any services and resources as inherited.

As an alternative, administrators can create and manage access groups to add an additional layer of resource-based control. Users who are assigned to an access group will inherit access and permissions from those set for the group itself, which may bypass restrictions set on the OU they are assigned to. For example, if an OU for engineering is without access to Drive and Docs, a user is assigned to an access group with access to Drive and Docs can bypass the child OU settings.

![Diagram showing access groups with custom application access than that of the child OU](/assets/images/google-workspace-attack-surface-part-one/image7.png)

GW’s organizational structure and layered approach to access control enables administrators to scope roles easier for users. Unfortunately, incomplete or misconfigured access controls could allow unexpected permission inheritance from the top-level OU. Access restrictions could unexpectedly be bypassed by users outside their expected access groups, thus introducing insider threat risk via additional cloud roles ([T1098.003](https://attack.mitre.org/techniques/T1098/003/)).

## Identity Access and Management

### Identity vs Account

The identity of users when using Google’s services is that of the account being used, often the email address. Identity does differ from user account slightly in that the identity of a user is unique, but the user account is a data structure keeping track of configurations, attributes, activities and more when interacting with Google’s services.

Standalone Gmail addresses (@gmail.com) are consumer accounts typically meant to be used by a private individual, whereas Gmail addresses with a registered domain name are managed user accounts as their lifecycle and configuration are fully managed by the organization. Therefore, when we discuss IAM in this publication, the context is typically towards managed user accounts whose identity and data is managed by the GW organization.

However, the relationship between identity and account does not have to be 1:1, meaning an email address, or identity, can be tied to two separate user accounts. If an organization does not enforce a new and separate identity for their users, risk looms around the private user account whom’s settings are managed by the user themselves, not the organization. In this example, the widespread use of valid compromised accounts undermines the ability of defenders to identify when this is malicious versus benign.

### Machine Accounts

Machine accounts exist and allow developers to interact with Google services and resources programmatically. These are not managed within GW, but rather Google Cloud Platform (GCP) via the use of service accounts. A bridge exists in the form of domain-wide delegation between GW and GCP.

This feature authorizes GCP service accounts to access data, resources, services and much more within GW via application APIs. OAuth2 is the protocol used for authentication between GCP service accounts and GW.

The most common risk of this approach is with the storage and use of service account credentials. Since service accounts often have elevated privileges due to their automation and programmatic intentions, adversaries prioritize finding these credentials, such as a Linux cloud worker. Often, public/private key pairs are stored insecurely for local scripts or programs that use them. Adversaries can then discover the unsecured credentials ([T1552](https://attack.mitre.org/techniques/T1552/)) from a text file, extract them from memory, environment variables or even log files. Once compromised, adversaries have a bridge into GW from GCP with a valid service account that may be monitored less diligently than a user account.

### Roles and Groups

Within GW, role-based access control (RBAC) only exists at the administrative level. This means the default and custom roles can be set up and configured from the admin console, however, the privileges available are mainly administrative. As we discussed earlier, Google’s hierarchy is top-down starting with the root OU, followed by child OUs; resources and services are enabled or disabled on a per-OU basis. By default a non-admin user belongs under the root OU, thus inheriting any access explicitly set at the root level where global privileges should be minimal.

Not to be confused with Google’s Group application, access groups allow administrators to set specific access and privileges to resources and services at the user-level, similar to role-level controls. Typically, a group is created and then privileges to resources and services are assigned. Users are then added as members to those specific groups, overriding or superseding inherited privileges from the OU.

### External Identities

As stated before, Gmail’s email names are unique IDs so users can use the same ID for both their consumer account and managed user accounts with the use of an external identity provider (IdP). This process typically requires single sign-on (SSO) via security assertion markup language (SAML) and therefore the IdP must recognize the identity before they can sign on.

Authentication is relayed from GW to the SAML IdP and relies on trusting the external provider’s identification verification. This is even true for active directory (AD) services or Okta where those become the external authoritative source. Data in transit during the SAML SSO process presents the greatest risk, and intercepted SAML responses to the IdP may be used to authenticate via forged credentials ([T1606.002](https://attack.mitre.org/techniques/T1606/002/)).

## Developer Resources

There are two methods for programmatically interacting with GW: Google [Apps Script](https://workspace.google.com/products/apps-script/)and [REST APIs](https://developers.google.com/workspace). Google Apps Script is an application development platform for fast and easy business applications to better integrate with GW. Whereas, REST APIs provide a direct method of communicating with GW, often in cases where integration is not fast or easy. External interaction with GW is another benefit to REST APIs, as Apps Script is meant for internal use.

### Apps Script

With Apps Script, developers use JavaScript with access to built-in libraries specific to each Google application. The term “rapid” is often emphasized because the platform is available at the domain, script.google.com, and tied directly to the organization the user is logged into, no installation at all. This tool can be extremely useful for accomplishing tasks in GW related to existing applications, administrative settings and more.

![Apps Script code written to create a Google doc and email it to myself](/assets/images/google-workspace-attack-surface-part-one/image5.jpg)

Each coding application you create in Apps Script is known as a project and can be used by other GW tools. Within that project, you write your JavaScript code as you see fit. From its console, you can run, debug or view execution logs.

The project can also be deployed to your GW with versioning control as a web application, API executable, Add-on or Library. Script’s can also be deployed as libraries, making code shareable across projects. Last but not least, triggers can be set for each project where specific functions can be run at specific times allowing developers to choose which code blocks are executed and when.

## Applications

In GW, the main attraction to organizations is typically the abundance of native applications offered by Google. Google’s Drive, Docs, Gmail, Sheets and Forms are just a few that are readily available to users for communication, storage, documentation or data gathering and analysis. All of these applications make up a user’s workspace, but are also targeted by adversaries because of their popularity and seamless integration with each other.

![Prompt](/assets/images/google-workspace-attack-surface-part-one/image8.jpg)

Therefore it is essential to understand that while applications compliment each other in GW, they often require [authorization](https://developers.google.com/apps-script/guides/services/authorization) to each other where access rights have to be explicitly granted by the user. While security practitioners may generally be suspicious of applications requiring access, general users may not and grant access without thinking twice. This then allows malicious applications such as Apps Script functions contained in a Google Sheet, to access the private data behind each application.

### Gmail

Arguably the most popular application provided by GW, Gmail has historically been abused by adversaries as a delivery mechanism for malicious attachments or links. For those unaware, Gmail is Google’s free email service with nearly 1.5 billion active users as of 2018, according to a statista [report](https://www.statista.com/statistics/432390/active-gmail-users/).

Phishing ([T1566](https://attack.mitre.org/techniques/T1566/)) is often the most common technique conducted by adversaries with the help of Gmail, where stealing valid credentials is the goal. Victims are sent emails containing malicious attachments or links where malware may be installed or a user is redirected to a fake website asking for credentials to login. If account compromise occurs, this allows for internal spear phishing ([T1534](https://attack.mitre.org/techniques/T1534/)) attacks, potentially targeted towards an existing administrator.

Email collection ([T1114](https://attack.mitre.org/techniques/T1114/)) is another technique used by adversaries whose modus operandi (MO), may be to simply collect sensitive information. In GW, administrators have privileges to set custom global mail routes for specific users, groups or OUs, whereas users can create their own forwarding rules as well. Capability for an adversary to do so, whether manually or programmatically, comes down to valid account compromise and therefore signs of this activity may be found later in the intrusion process.

Taking Gmail a step further, adversaries may also use GW’s web services ([T1102](https://attack.mitre.org/techniques/T1102/)) for command and control purposes as [identified](https://www.welivesecurity.com/2020/05/26/agentbtz-comratv4-ten-year-journey/) by ESET researchers regarding the ComRAT v4 backdoor of 2020. With attribution pointed towards advanced persistent threat (APT) group, Turla, the abuse of Gmail is also a tool for more advanced threats.

### Drive

[Google Drive](https://workspace.google.com/products/drive/), being a free digital storage service with an active Gmail account, is also a common target by adversaries. Where valid accounts are compromised, adversaries have the capability to steal private data stored in Google Drive. Sharing documents in Google Drive relies on a trust model, where the user can create a custom shareable link and invite others. Administrators have the capability to enable and expose public shared drives from their organization as well. Access and privileges rely on sharing permissions set by the owner or organization and the intended recipient for either the shareable link or Google cloud identity who has access to those shared objects.

Let’s not forget that GW allows administrators to set up enterprise mobility management (EMM) and mobile device management (MDM) for mobile devices. These mobile devices then have access to private shared drives in an organization’s Google drive space. An adversary could take advantage of this to obtain unauthorized access to mobile devices via these remote services ([TA0039](https://attack.mitre.org/tactics/TA0039/)). Geographic coordinates of a mobile device or end user could also be obtained from such services if abused to do so.

Command and control via bidirectional communication ([T1102.002](https://attack.mitre.org/techniques/T1102/002/)) to a Google Drive is another option for adversaries who may be using the service to host and deploy malicious payloads as those from [APT29](https://unit42.paloaltonetworks.com/cloaked-ursa-online-storage-services-campaigns/). Oftentimes, this reflects compromised web services ([T1584.006](https://attack.mitre.org/techniques/T1584/006/)) simply through a valid account and enabled Google Drive API. This is often the case when adversaries may leverage Google Drive to stage exfiltrated data programmatically prior to its final destination.

### Docs

Integrated with Google Drive is [Google Docs](https://workspace.google.com/products/docs/), a free online word processing service where users can create documents which are then stored in their Google Drive. For collaboration purposes, documents have extensive markup capabilities, such as comments, which have recently been abused to distribute phishing and malware. This technique, [discussed](https://www.avanan.com/blog/google-docs-comment-exploit-allows-for-distribution-of-phishing-and-malware) by Check Point company, Avanan, allows adversaries to simply create a document and add a comment where they include the target’s email address and a malicious link, helping evade spam filters and security tools. Combining this phishing campaign with a native JavaScript application development platform such as Apps Script in GW would allow for expanded distribution with minimal costs. Luckily the extent of malicious Google documents ends with malicious links, but it would be immature to suggest adversaries will not eventually develop new techniques to abuse the service.

### Sheets

As with Google Docs, [Google Sheets](https://workspace.google.com/products/sheets/) is another service often abused by adversaries to deliver malicious links or payloads. Google Sheets is a spreadsheet program, similar to Excel from Microsoft. Automated tasks can be created with the use of macros and of course triggers for those macros to be executed as well. While built-in functions exist, custom functions can be created via Google’s Apps Script platform and then imported into the Google Sheet document itself. Apps Script has native JavaScript libraries for interacting with other Google services and their respectful APIs. Thus if an adversary were to weaponize a Google Sheet document of their liking, resource development starts with a custom function, built with Apps Script. The function is imported into the Google Sheet and then shared with the intended target by commenting their email address and allowing access. Once triggered, the malicious code from the function would be executed and continue the intrusion process.

A step further may be to share with them a [copy link](https://support.google.com/a/users/answer/9308866?hl=en), rather than an edit link which would copy the sheet containing the malicious macro to their own Google drive and upon execution carry out the intended task as the user since the sheet’s owner is now the target. For distribution, access to a user’s contacts within their GW organization, may allow worm-like capabilities as [discovered](https://nakedsecurity.sophos.com/2017/05/05/google-phish-thats-a-worm-what-happened-and-what-to-do/) by Sophos in 2017.

## Marketplace

GW’s [marketplace](https://apps.google.com/supportwidget/articlehome?hl=en&article_url=https%3A%2F%2Fsupport.google.com%2Fa%2Fanswer%2F172391%3Fhl%3Den&product_context=172391&product_name=UnuFlow&trigger_context=a) is an online application store with additional enterprise applications that can be integrated into an organization and accessed by users. Administrators are responsible for managing application accessibility and surveying risk associated with such apps. A large portion of these applications are 3rd-party and Google clearly states their [policies](https://developers.google.com/workspace/marketplace/terms/policies) for being a contributor. The risk associated with 3rd-party applications in the GW marketplace is access to private data from information repositories ([T1213](https://attack.mitre.org/techniques/T1213/)) or the resident data of the user and/or organization behind each application.

Granted for administrators, when browsing applications, permission access can be reviewed via the application itself prior to installation. This way, administrators can review whether the risk inherited from such access is worth the solution it potentially may provide.

![GW access request example for Signeasy application](/assets/images/google-workspace-attack-surface-part-one/image4.jpg)

## Reporting

As with most cloud consoles and environments, GW has a native reporting feature that helps administrators capture the activity in their environment. Located in the admin console of GW under Reporting, administrators have the following options.

- Highlights - Dashboard of basic metrics for GW environments
- Reports - Apps, cost, user and devices reporting in the form of basic dashboard metrics or tabled data about user accounts
- Audit and Investigation - Location of all logs, categorized by activity
- Manage Reporting Rules - Redirection to rules space, filtering on “Reporting” rules which are custom
- Email Log Search - Search across the Gmail accounts of all users within the organization. Filters include Date, Sender, Sender IP, Recipient, Recipient IP, Subject and Message ID
- Application Uptime - Uptime for applications enabled in the GW. Uptime is relative to Google’s infrastructure.

Of this reporting, Google does a decent job of providing tabular data about user status and account activity in GW such as 2-step verification status and password strength, as well as additional security metrics. For example, shared links to Google resources that have been accessed outside of the domain. Additional user report documentation from Google can be found [here](https://apps.google.com/supportwidget/articlehome?hl=en&article_url=https%3A%2F%2Fsupport.google.com%2Fa%2Fanswer%2F4580176%3Fhl%3Den&product_context=4580176&product_name=UnuFlow&trigger_context=a).

The most reliable data is GW’s native logging, found under “Audit and Investigation”. As stated prior, these logs are organized into their own separate folders based on activity, application, identity or resource.

![Admin log events from GW reporting](/assets/images/google-workspace-attack-surface-part-one/image9.png)

Logs are stored in a tabular format with date, event, description, actor and IP address all being recorded by default. The description contains another layer of verbosity as to what activity occurred, oftentimes including JSON key and value pairs for specific values pulled from the GW for reporting.

In regards to threats, often adversaries will attempt indicator removal ([T1070](https://attack.mitre.org/techniques/T1070/)) by clearing audit logs to remove any potential footprints, however, GW audit logs are managed by Google and have [retention policies](https://apps.google.com/supportwidget/articlehome?hl=en&article_url=https%3A%2F%2Fsupport.google.com%2Fa%2Fanswer%2F7061566%3Fhl%3Den&product_context=7061566&product_name=UnuFlow&trigger_context=a) only. Therefore, it is essential to route audit logs from GW to an on-premise or cloud storage solution such as GCP via storage buckets. For more information on how Elastic’s GW integration routes audit logs, visit [here](https://docs.elastic.co/en/integrations/google_workspace).

## Rules

While GW provides a reporting feature that focuses on logging activity within an organization’s digital environment, it also has a detection rules feature as well.

These are not directly marketed as a security information and event management (SIEM) tool, but resemble that functionality. Shipped with some default rules, the “Rules” feature in GW allows administrators to automatically monitor for specific activity and set specific actions. Each rule allows you to customize the conditions for the rule to match on and of course what actions to perform when conditions are met. Rules are broken down into reporting, activity, data protection, system defined, or trust rules where custom creation and viewing require specific privileges.

![Administrator view of existing rules](/assets/images/google-workspace-attack-surface-part-one/image10.png)

In regards to granularity, administrators are at the mercy of data sourced from the audit logs when creating custom rules, whereas system defined rules provided by Google have additional data source insight. Rule alerts are directly accessible via the security alert center feature in GW, where further analysis, assignment, status and more can be edited.

![User suspended alert in GW](/assets/images/google-workspace-attack-surface-part-one/image3.jpg)

## Conclusion

With this introduction to GW as an attack surface, we hope you better understand the risks associated with these enterprise resources. Powerful virtual workspaces have become an essential capability of distributed productivity, which both establishes their utility and exposes them to threats. As adversaries continue to abuse GW, enterprises would be well-advised to understand its security while taking ownership of improving it. Proper administration, strong policy settings, IAM, and using the visibility they have are some of the recommendations we would offer.

Soon we’ll release part two in this series and show you have to setup a threat detection lab for GW with Elastic components. And in our third publication, we’ll explore in-depth attack scenarios that reveal specific defensive strategies aligned to success.
